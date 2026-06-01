import base64
import io
from typing import Dict, Any
from PIL import Image
import easyocr
import numpy as np

# Initialize EasyOCR reader (lazy load to avoid startup delay)
_reader = None

def get_reader():
    global _reader
    if _reader is None:
        # Using English; add other languages as needed
        _reader = easyocr.Reader(['en'], gpu=False)
    return _reader


def ocr_from_base64(image_base64: str) -> Dict[str, Any]:
    """Perform OCR on a base64-encoded image."""
    try:
        # Decode base64 image
        image_data = base64.b64decode(image_base64)
        image = Image.open(io.BytesIO(image_data))

        # Convert PIL Image to numpy array
        np_image = np.array(image)

        # Run OCR
        reader = get_reader()
        results = reader.readtext(np_image)

        # Extract text
        texts = [result[1] for result in results]
        full_text = " ".join(texts)

        return {
            "success": True,
            "text": full_text,
            "blocks": len(texts),
        }

    except Exception as e:
        return {
            "success": False,
            "text": "",
            "error": str(e),
        }
