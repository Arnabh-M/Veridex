"""
Video deepfake detection module.

This module samples frames from a video at approximately 2 FPS, runs each sampled
frame through the image detector, and aggregates frame-level outputs into a single
video-level verdict.
"""

from __future__ import annotations

import os
import tempfile
from pathlib import Path
from typing import Any, Dict, List, Set

import cv2
import numpy as np
from PIL import Image

from .image_detector import analyze_image


def analyze_video(video_path: str) -> Dict[str, Any]:
    """
    Analyze a video for deepfake likelihood by sampling frames and aggregating results.

    Args:
        video_path: Path to the input video file.

    Returns:
        A dictionary with snake_case keys containing:
        - result: "FAKE", "REAL", or "ERROR"
        - confidence: average confidence across analyzed frames
        - fake_frames: number of analyzed frames classified as fake
        - total_frames_analyzed: number of sampled frames analyzed
        - fake_ratio: fake_frames / total_frames_analyzed
        - duration_sec: approximate video duration in seconds
        - frame_timeline: list of per-frame analysis dictionaries
        - flags: combined unique flags across analyzed frames

        On failure, returns an error dictionary with result="ERROR".
    """
    try:
        video_file = Path(video_path)
        cap = cv2.VideoCapture(str(video_file))

        if not cap.isOpened():
            return {
                "result": "ERROR",
                "confidence": 0,
                "flags": ["video_open_failed"],
                "error": "Unable to open video file.",
            }

        fps = cap.get(cv2.CAP_PROP_FPS)
        if not fps or fps <= 0:
            fps = 25.0

        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration_sec = round(total_frames / fps, 1) if fps > 0 else 0.0
        sample_interval = max(1, int(fps / 2))

        frame_results: List[Dict[str, Any]] = []
        all_flags: Set[str] = set()

        frame_num = 0
        while True:
            ret, frame = cap.read()
            if not ret:
                break

            if frame_num % sample_interval == 0:
                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                pil_img = Image.fromarray(rgb_frame)

                tmp_path = ""
                try:
                    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp_file:
                        tmp_path = tmp_file.name

                    pil_img.save(tmp_path, format="JPEG")
                    result = analyze_image(tmp_path)
                finally:
                    if tmp_path and os.path.exists(tmp_path):
                        os.remove(tmp_path)

                confidence = float(result.get("confidence", 0))
                frame_result = {
                    "frame": frame_num,
                    "timestamp_sec": round(frame_num / fps, 2),
                    "confidence": confidence,
                    "result": result.get("result", "ERROR"),
                    "flags": result.get("flags", []),
                }
                frame_results.append(frame_result)
                all_flags.update(frame_result["flags"])

            frame_num += 1

        cap.release()

        if not frame_results:
            return {
                "result": "ERROR",
                "confidence": 0,
                "fake_frames": 0,
                "total_frames_analyzed": 0,
                "fake_ratio": 0.0,
                "duration_sec": duration_sec,
                "frame_timeline": [],
                "flags": ["no_frames_analyzed"],
                "error": "No frames were analyzed from the video.",
            }

        scores = [frame["confidence"] for frame in frame_results]
        avg_confidence = round(float(np.mean(scores)), 1)
        fake_frames = sum(1 for frame in frame_results if frame["result"] == "FAKE")
        fake_ratio = fake_frames / len(frame_results)
        final_result = "FAKE" if (avg_confidence > 55 or fake_ratio > 0.4) else "REAL"

        return {
            "result": final_result,
            "confidence": avg_confidence,
            "fake_frames": fake_frames,
            "total_frames_analyzed": len(frame_results),
            "fake_ratio": round(fake_ratio, 2),
            "duration_sec": duration_sec,
            "frame_timeline": frame_results,
            "flags": list(all_flags),
        }
    except Exception as e:  # noqa: BLE001 - explicit requirement to catch all exceptions
        return {
            "result": "ERROR",
            "confidence": 0,
            "flags": ["analysis_exception"],
            "error": str(e),
        }
