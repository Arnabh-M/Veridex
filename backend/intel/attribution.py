import os
import re
from typing import Dict, List, Optional, Any

try:
    from langdetect import detect, LangDetectException

    LANGDETECT_AVAILABLE = True
except ImportError:  # pragma: no cover
    detect = None  # type: ignore[assignment]
    LangDetectException = Exception  # type: ignore[assignment]
    LANGDETECT_AVAILABLE = False


LANGUAGE_TO_REGION: Dict[str, str] = {
    "zh": "East Asia (likely China)",
    "zh-cn": "East Asia (likely China)",
    "ru": "Eastern Europe (likely Russia)",
    "ar": "Middle East / North Africa",
    "fa": "Middle East (likely Iran)",
    "ko": "East Asia (likely Korea)",
    "hi": "South Asia (likely India)",
    "ur": "South Asia (likely Pakistan)",
    "tr": "Central Asia / Turkey",
    "de": "Western Europe",
    "fr": "Western Europe (likely France)",
    "es": "Latin America / Spain",
    "en": "English-speaking region (US/UK/AU)",
    "ja": "East Asia (likely Japan)",
    "vi": "Southeast Asia",
    "th": "Southeast Asia (likely Thailand)",
}


TIMEZONE_OFFSET_TO_REGION: Dict[int, str] = {
    8: "East Asia (China/Philippines/Singapore)",
    9: "East Asia (Japan/Korea)",
    5: "South Asia (Pakistan/Kazakhstan)",
    6: "South Asia (India +5:30 approximate)",
    3: "Eastern Europe / Middle East (Russia/Turkey)",
    2: "Eastern Europe / Eastern Africa",
    1: "Western Europe / West Africa",
    0: "UK / West Africa",
    -5: "Eastern USA / Colombia",
    -8: "Western USA",
    -3: "South America (Brazil/Argentina)",
}


def _detect_language(text: str) -> Optional[str]:
    if LANGDETECT_AVAILABLE and text and len(text) > 20:
        try:
            return detect(text)  # type: ignore[misc]
        except LangDetectException:
            return None
        except Exception:
            return None
    return None


def _infer_timezone_offset(details: dict) -> Optional[int]:
    delta_seconds = details.get("timestamp_delta_seconds")
    if delta_seconds is None:
        return None
    try:
        offset = round(float(delta_seconds) / 3600.0)
        return int(offset)
    except Exception:
        return None


def _get_gan_fingerprint(confidence: float, flags: List[str]) -> str:
    if confidence >= 0.90:
        result = "Likely StyleGAN3 or similar high-fidelity GAN"
    elif confidence >= 0.75:
        result = "Possible Midjourney v5/v6 or DALL-E 3"
    elif confidence >= 0.55:
        result = "Possible Stable Diffusion or similar open-source model"
    elif confidence >= 0.35:
        result = "Possible face-swap tool (DeepFaceLab/FaceFusion/Roop)"
    else:
        result = "Insufficient signal for tool attribution"

    if "ai_software_signature" in (flags or []):
        result += " (AI software signature detected in metadata)"

    return result


def attribute_source(analysis: dict) -> dict:
    """
    Takes the full analysis/report dict and returns speculative attribution.
    Never claims certainty — always labels results as speculative.
    """

    result: Dict[str, Any] = {
        "origin_region": "Unknown",
        "confidence": "LOW",
        "tool_fingerprint": "Insufficient data",
        "timezone_hint": None,
        "language_hint": None,
        "notes": "Attribution is speculative and based on available metadata signals.",
        "disclaimer": "This attribution data is speculative. Do not use as sole basis for operational decisions.",
    }

    try:
        metadata = analysis.get("details", {}) or {}
        flags = analysis.get("flags", []) or []
        confidence_score = float(analysis.get("confidence", 0)) / 100.0

        signals_found: List[str] = []

        text_to_check = " ".join(
            filter(
                None,
                [
                    str(metadata.get("image_comment", "")),
                    str(metadata.get("encoder_comment_values", "")),
                    str(metadata.get("image_software", "")),
                ],
            )
        )

        if text_to_check.strip():
            lang = _detect_language(text_to_check)
            if lang and lang in LANGUAGE_TO_REGION:
                result["language_hint"] = lang
                result["origin_region"] = LANGUAGE_TO_REGION[lang]
                signals_found.append(f"language:{lang}")
                result["confidence"] = "MEDIUM"

        tz_offset = _infer_timezone_offset(metadata)
        if tz_offset is not None:
            region = TIMEZONE_OFFSET_TO_REGION.get(tz_offset)
            if region:
                result["timezone_hint"] = f"UTC{'+' if tz_offset >= 0 else ''}{tz_offset} → {region}"
                signals_found.append(f"timezone:UTC{tz_offset}")
                if result["origin_region"] == "Unknown":
                    result["origin_region"] = region
                    result["confidence"] = "LOW"

        result["tool_fingerprint"] = _get_gan_fingerprint(confidence_score, flags)

        if "no_camera_metadata" in flags:
            signals_found.append("no_camera_metadata")

        if "ai_software_signature" in flags:
            signals_found.append("ai_software_detected")
            result["confidence"] = "MEDIUM"
            ai_match = metadata.get("ai_software_match") or metadata.get("ai_comment_match", "")
            if ai_match:
                result["tool_fingerprint"] = f"Confirmed: {ai_match} (detected in file metadata)"

        if signals_found:
            result["notes"] = (
                f"Attribution based on {len(signals_found)} signal(s): "
                f"{', '.join(signals_found)}. "
                "All findings are speculative."
            )
        else:
            result["notes"] = "No strong attribution signals found in available metadata."

    except Exception as e:
        result["notes"] = f"Attribution analysis encountered an error: {str(e)}"

    return result


__all__ = ["attribute_source"]

