"""
Convert FAISS vector store to JSON format for serverless deployment
"""
import json
import os
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.embeddings import HuggingFaceEmbeddings

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FOLDER = os.path.join(SCRIPT_DIR, "..", "data")
OUTPUT_FILE = os.path.join(SCRIPT_DIR, "..", "..", "frontend", "public", "vector_store.json")

def load_all_text():
    combined_text = ""
    for file in os.listdir(DATA_FOLDER):
        if file.endswith(".txt"):
            with open(os.path.join(DATA_FOLDER, file), "r", encoding="utf-8") as f:
                combined_text += f.read() + "\n"
    return combined_text

def main():
    print("Loading data...")
    text = load_all_text()

    print("Splitting into chunks...")
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=50
    )
    docs = splitter.create_documents([text])

    print("Creating embeddings...")
    embeddings = HuggingFaceEmbeddings(
        model_name="sentence-transformers/all-MiniLM-L6-v2"
    )

    # Create embeddings for all chunks
    embeddings_list = []
    for i, doc in enumerate(docs):
        print(f"Processing chunk {i+1}/{len(docs)}...")
        embedding = embeddings.embed_query(doc.page_content)
        embeddings_list.append({
            "text": doc.page_content,
            "embedding": embedding
        })

    # Save to JSON
    print("Saving to JSON...")
    output = {
        "model": "sentence-transformers/all-MiniLM-L6-v2",
        "chunks": embeddings_list
    }
    
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2)

    print(f"Vector store created successfully with {len(embeddings_list)} chunks!")
    print(f"File saved to: {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
