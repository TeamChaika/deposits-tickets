from fastapi import fastapi
app = fastapi.FastAPI()

@app.get("/")
def read_root():
    return {"message": "Hello, World!"}

    # To create a virtual environment, run the following command in your terminal:
    # python3 -m venv venv

    # To activate the virtual environment:
    # On Windows:
    # venv\Scripts\activate
    # On macOS/Linux:
    # source venv/bin/activate

    # Add 'venv' to your .gitignore file to prevent it from being committed:
    # Open your .gitignore file and add the following line:
    # venv/
