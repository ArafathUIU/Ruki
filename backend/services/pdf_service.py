import os
import re
from typing import List, Dict, Any, Optional
import pdfplumber
from ..config import UPLOADS_DIR
from ..database import add_document, get_document_chunks
from .ai_service import find_relevant_chunks


def extract_text_from_pdf(file_path: str) -> Dict[str, Any]:
    """Extract text from a PDF file."""
    text_parts = []
    total_pages = 0

    try:
        with pdfplumber.open(file_path) as pdf:
            total_pages = len(pdf.pages)
            for i, page in enumerate(pdf.pages):
                page_text = page.extract_text()
                if page_text:
                    text_parts.append(f"--- Page {i + 1} ---\n{page_text}")
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "text": "",
            "total_pages": 0,
        }

    full_text = "\n\n".join(text_parts)
    return {
        "success": True,
        "error": None,
        "text": full_text,
        "total_pages": total_pages,
    }


def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 200) -> List[str]:
    """Split text into overlapping chunks for RAG."""
    chunks = []
    start = 0
    text_length = len(text)

    while start < text_length:
        end = min(start + chunk_size, text_length)
        # Try to break at a sentence or paragraph
        if end < text_length:
            # Look for sentence endings within the last 100 characters
            search_start = max(end - 100, start)
            sentence_end = text.rfind('. ', search_start, end)
            if sentence_end != -1:
                end = sentence_end + 1
            else:
                paragraph_end = text.rfind('\n\n', search_start, end)
                if paragraph_end != -1:
                    end = paragraph_end + 2

        chunks.append(text[start:end].strip())
        start = end - overlap
        if start >= end:
            break

    return chunks


def process_pdf(file_path: str, original_filename: str) -> Dict[str, Any]:
    """Process a PDF: extract text, chunk it, and store in database."""
    extraction = extract_text_from_pdf(file_path)

    if not extraction["success"]:
        return extraction

    text = extraction["text"]
    chunks = chunk_text(text)

    doc_id = add_document(
        title=original_filename,
        file_path=file_path,
        extracted_text=text,
        chunks=chunks,
        total_pages=extraction["total_pages"],
    )

    return {
        "success": True,
        "document_id": doc_id,
        "title": original_filename,
        "total_pages": extraction["total_pages"],
        "chunk_count": len(chunks),
    }


def get_document_context(query: str, document_id: Optional[int] = None) -> str:
    """Retrieve relevant context from documents for RAG."""
    if document_id:
        chunks = get_document_chunks(document_id)
        if chunks:
            return find_relevant_chunks(query, chunks)

    # If no specific document, check all documents (simplified)
    from ..database import get_documents
    docs = get_documents()
    all_chunks = []
    for doc in docs:
        all_chunks.extend(get_document_chunks(doc['id']))

    if all_chunks:
        return find_relevant_chunks(query, all_chunks)

    return ""
