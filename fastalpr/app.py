import os
import statistics
from contextlib import asynccontextmanager

import cv2
import numpy as np
from fast_alpr import ALPR
from fastapi import FastAPI, File, Header, HTTPException, UploadFile

alpr: ALPR | None = None
internal_token = os.getenv("FASTALPR_INTERNAL_TOKEN", "")


@asynccontextmanager
async def lifespan(_: FastAPI):
    global alpr
    alpr = ALPR(
        detector_model=os.getenv(
            "FASTALPR_DETECTOR_MODEL",
            "yolo-v9-t-384-license-plate-end2end",
        ),
        detector_conf_thresh=float(os.getenv("FASTALPR_DETECTOR_CONFIDENCE", "0.45")),
        ocr_model=os.getenv("FASTALPR_OCR_MODEL", "cct-xs-v2-global-model"),
        ocr_device="cpu",
    )
    yield
    alpr = None


app = FastAPI(title="Vehicle Control FastALPR", lifespan=lifespan)


@app.get("/health")
def health():
    return {"status": "ready" if alpr is not None else "starting"}


@app.post("/recognize")
async def recognize(
    image: UploadFile = File(...),
    x_internal_token: str | None = Header(default=None),
):
    if internal_token and x_internal_token != internal_token:
        raise HTTPException(status_code=401, detail="Invalid internal token")

    if alpr is None:
        raise HTTPException(status_code=503, detail="ALPR model is not ready")

    content = await image.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty image")

    frame = cv2.imdecode(np.frombuffer(content, dtype=np.uint8), cv2.IMREAD_COLOR)
    if frame is None:
        raise HTTPException(status_code=400, detail="Invalid image")

    predictions = []
    for result in alpr.predict(frame):
        if result.ocr is None or not result.ocr.text:
            continue

        ocr_confidence = result.ocr.confidence
        confidence = (
            statistics.mean(ocr_confidence)
            if isinstance(ocr_confidence, list)
            else ocr_confidence
        )
        box = result.detection.bounding_box
        predictions.append(
            {
                "plate": result.ocr.text,
                "confidence": round(float(confidence), 4),
                "region": result.ocr.region,
                "regionConfidence": result.ocr.region_confidence,
                "detectionConfidence": float(
                    getattr(result.detection, "confidence", 0.0)
                ),
                "box": {
                    "x1": int(box.x1),
                    "y1": int(box.y1),
                    "x2": int(box.x2),
                    "y2": int(box.y2),
                },
            }
        )

    predictions.sort(key=lambda item: item["confidence"], reverse=True)
    return {"predictions": predictions}
