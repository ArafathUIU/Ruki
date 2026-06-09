import base64
import io
from typing import Dict, Any
from PIL import Image, ImageGrab
import easyocr
import numpy as np

# Initialize EasyOCR reader (lazy load to avoid startup delay)
_reader = None

def get_reader():
    global _reader
    if _reader is None:
        _reader = easyocr.Reader(['en'], gpu=False)
    return _reader


def ocr_from_base64(image_base64: str) -> Dict[str, Any]:
    """Perform OCR on a base64-encoded image."""
    try:
        image_data = base64.b64decode(image_base64)
        image = Image.open(io.BytesIO(image_data))
        np_image = np.array(image)
        reader = get_reader()
        results = reader.readtext(np_image)
        texts = [result[1] for result in results]
        full_text = " ".join(texts)
        return {"success": True, "text": full_text, "blocks": len(texts)}
    except Exception as e:
        return {"success": False, "text": "", "error": str(e)}


def ocr_from_screen_region(x: int, y: int, width: int, height: int) -> Dict[str, Any]:
    """Capture a screen region using PIL.ImageGrab and run OCR."""
    try:
        screenshot = ImageGrab.grab(bbox=(x, y, x + width, y + height))
        np_image = np.array(screenshot)
        reader = get_reader()
        results = reader.readtext(np_image)
        texts = [result[1] for result in results]
        full_text = " ".join(texts)
        return {"success": True, "text": full_text, "blocks": len(texts)}
    except Exception as e:
        return {"success": False, "text": "", "error": str(e)}
