"""
backend/utils/ai_provider.py
-----------------------------
Provider-agnostic AI layer for ResumeIQ.

THIS IS THE ONLY FILE THAT IMPORTS OR CALLS GROQ (OR ANY AI SDK).

To switch providers, change AI_PROVIDER in backend/.env — no other file changes needed.

Supported: groq | openai | anthropic | gemini | openrouter
"""

import os
import json
import re

PROVIDER = os.getenv("AI_PROVIDER", "groq")

MODEL_DEFAULTS = {
    "groq":       "llama-3.3-70b-versatile",
    "openai":     "gpt-4o-mini",
    "anthropic":  "claude-haiku-4-5",
    "gemini":     "gemini-1.5-flash",
    "openrouter": "meta-llama/llama-3.3-70b-instruct",
}
MODEL = os.getenv("AI_MODEL", MODEL_DEFAULTS.get(PROVIDER, "llama-3.3-70b-versatile"))

# ── System Prompts ─────────────────────────────────────────────────────────────

ANALYSIS_SYSTEM = """You are an expert ATS resume analyzer, career strategist, and interview coach.

Analyze the resume text against the job description and return a comprehensive assessment.

CRITICAL: Return ONLY a valid JSON object. No markdown. No backticks. No preamble.
Start your response with { and end with }.

Required JSON structure:
{
  "score": <integer 0-100>,
  "verdict": "<Strong Match|Partial Match|Low Match>",
  "summary": "<2-3 sentence honest overall assessment>",
  "matched_skills": ["<skill present in both resume and JD>"],
  "missing_skills": ["<skill required by JD but absent from resume>"],
  "ats_warnings": ["<specific ATS risk or issue>"],
  "improvement_tips": [
    {"section": "<Summary|Experience|Skills|Education|General>", "priority": "<High|Medium|Low>", "tip": "<actionable tip>"}
  ],
  "interview_questions": [
    {"question": "<realistic interview question>", "why_asked": "<reason>", "talking_point": "<how to answer using resume>"}
  ],
  "gap_projects": [
    {"skill": "<missing skill>", "project": "<concrete buildable project>", "timeline": "<e.g. 1 weekend>", "impact": "<High|Medium|Low>"}
  ],
  "resume_sections": {
    "summary": "<extracted summary text or empty string>",
    "experience": "<extracted experience text or empty string>",
    "skills": "<extracted skills text or empty string>",
    "education": "<extracted education text or empty string>"
  }
}"""

COVER_LETTER_SYSTEM = """You are an expert professional cover letter writer.

Write a compelling, personalized cover letter for the candidate.
- Exactly 3-4 paragraphs
- Professional yet human tone
- Strong opening hook — no generic openers
- Connect candidate achievements to the role's key requirements
- Address skill gaps positively
- Confident closing with call to action
- NEVER use: "I am writing to apply", "To Whom It May Concern", "I believe I would be a great fit"

Return ONLY the cover letter body text. No subject line. No labels. No explanation."""

REWRITE_SYSTEM = """You are an expert ATS resume writer.

Rewrite the provided section following these rules:
1. Start every bullet with a strong past-tense action verb
2. Quantify achievements — add realistic numbers where implied
3. Weave in relevant keywords from the job description naturally
4. Remove filler phrases: "responsible for", "helped with", "worked on"
5. Follow Action + Task + Result format for each bullet
6. Keep the same number of bullet points as the original

Return ONLY the rewritten section text. No explanation. No preamble."""


# ── Provider router ────────────────────────────────────────────────────────────

def _chat(system: str, user: str, as_json: bool = False, max_tokens: int = 2000) -> str:
    """Single internal function that calls the configured AI provider."""

    if PROVIDER == "groq":
        from groq import Groq
        client = Groq(api_key=os.environ["GROQ_API_KEY"])
        kwargs = {
            "model": MODEL,
            "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
            "max_tokens": max_tokens,
        }
        if as_json:
            kwargs["response_format"] = {"type": "json_object"}
        return client.chat.completions.create(**kwargs).choices[0].message.content

    elif PROVIDER in ("openai", "openrouter"):
        from openai import OpenAI
        client = OpenAI(
            api_key=os.environ.get("OPENROUTER_API_KEY" if PROVIDER == "openrouter" else "OPENAI_API_KEY"),
            base_url="https://openrouter.ai/api/v1" if PROVIDER == "openrouter" else None,
        )
        kwargs = {
            "model": MODEL,
            "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
            "max_tokens": max_tokens,
        }
        if as_json:
            kwargs["response_format"] = {"type": "json_object"}
        return client.chat.completions.create(**kwargs).choices[0].message.content

    elif PROVIDER == "anthropic":
        import anthropic
        return anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"]).messages.create(
            model=MODEL, max_tokens=max_tokens, system=system,
            messages=[{"role": "user", "content": user}],
        ).content[0].text

    elif PROVIDER == "gemini":
        import google.generativeai as genai
        genai.configure(api_key=os.environ["GEMINI_API_KEY"])
        return genai.GenerativeModel(MODEL, system_instruction=system).generate_content(user).text

    else:
        raise ValueError(f"Unknown AI_PROVIDER: '{PROVIDER}'. Choose: groq|openai|anthropic|gemini|openrouter")


def _parse_json(raw: str) -> dict:
    cleaned = re.sub(r"^```(?:json)?\s*\n?", "", raw.strip(), flags=re.IGNORECASE)
    cleaned = re.sub(r"\n?\s*```\s*$", "", cleaned).strip()
    return json.loads(cleaned)


# ── Public API — the only functions imported by app.py ────────────────────────

def generate_ai_feedback(resume_text: str, job_description: str) -> dict:
    raw = _chat(
        ANALYSIS_SYSTEM,
        f"RESUME TEXT:\n{resume_text}\n\nJOB DESCRIPTION:\n{job_description}\n\nReturn the JSON assessment.",
        as_json=True, max_tokens=2800,
    )
    return _parse_json(raw)


def generate_cover_letter(resume_text: str, job_description: str, analysis: dict) -> str:
    matched = ", ".join((analysis.get("matched_skills") or [])[:5])
    missing = ", ".join((analysis.get("missing_skills") or [])[:2])
    return _chat(
        COVER_LETTER_SYSTEM,
        f"Write a cover letter.\n\nRESUME:\n{resume_text}\n\nJOB DESCRIPTION:\n{job_description}\n\n"
        f"ATS match: {analysis.get('score')}/100 ({analysis.get('verdict')})\n"
        f"Key strengths: {matched}\nAddress gaps: {missing}",
        max_tokens=1400,
    )


def rewrite_resume_section(section_name: str, section_content: str, job_description: str) -> str:
    return _chat(
        REWRITE_SYSTEM,
        f"Rewrite this {section_name} section.\n\nORIGINAL {section_name.upper()}:\n{section_content}\n\nJOB DESCRIPTION:\n{job_description}",
        max_tokens=1000,
    )


def generate_interview_questions(resume_text: str, job_description: str) -> list:
    raw = _chat(
        "Expert interview coach. Return ONLY valid JSON, no markdown.",
        f"Generate 10 interview questions.\n\nRESUME:\n{resume_text}\n\nJOB:\n{job_description}\n\n"
        'Return: {"questions": [{"question":"...","why_asked":"...","talking_point":"..."}]}',
        as_json=True, max_tokens=2000,
    )
    return _parse_json(raw).get("questions", [])
