import os
import base64
from anthropic import Anthropic

# Initialize the Claude client
# Make sure you have your environment variable set: export ANTHROPIC_API_KEY="your-key"
client = Anthropic()

def encode_image(image_path):
    """Encodes a local reference image to base64 for Claude Vision."""
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')

def load_file_content(file_path):
    """Loads the existing HTML/CSS layout files."""
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        return f"File not found at {file_path}. Please check the path."

def run_migration_agent(html_path, screenshot_path, output_dir="./src"):
    print("🤖 Agent initialized. Analyzing template and visual styles...")
    
    # 1. Gather all raw context
    raw_html = load_file_content(html_path)
    base64_image = encode_image(screenshot_path)
    
    # 2. Construct the Agent's Instructions
    system_prompt = (
        "You are an expert Frontend Engineering Agent specialized in migrating legacy "
        "HTML/CSS landing pages and designs into highly functional, clean React components. "
        "Your priority is to perfectly preserve the existing aesthetics, typography, and spacing "
        "visible in the provided layout and image, while injecting robust state management for functionality."
    )
    
    user_prompt = f"""
    I need you to transform the following legacy static layout into a clean React application.
    
    Here is the existing raw HTML layout for structure reference:
    ```html
    {raw_html}
    ```
    
    Attached is the visual reference screenshot showing exactly how it looks when rendered.
    
    ### Requirements:
    1. **Architecture**: Create a single-page app containing 3 main views/routes: Home, Calendar, and Sync.
    2. **Styling**: Ensure styles match the image and HTML layout perfectly. If using Tailwind CSS, map the inline styles over accurately.
    3. **Home Page**: Show a clean overview and a 'Next Coming Events' panel fetching from the calendar state. 
    4. **Calendar Page**: 
       - Implement a functional grid calendar interface.
       - Implement a working '+' action button.
       - Clicking '+' must open a modal allowing the user to select preset activities (e.g., 'Homework', 'Activity').
       - These activities must use designated default colors, but structure the code so these colors can eventually be read from an app-level 'Settings' object or context.
    5. **Sync Page**: A placeholder landing layout matching the styling provided.
    6. **State**: Use React's useState/useEffect or Context API to store events so changes persist during a single session (or optionally wire up localStorage).
    
    Please output the critical component files needed (`App.jsx`, `Calendar.jsx`, `Home.jsx`, `Sync.jsx`) wrapped inside clear markdown code blocks specifying their target paths.
    """

    # 3. Fire the agent request
    response = client.messages.create(
        model="claude-3-5-sonnet-20241022", # Best model for vision + structural coding tasks
        max_tokens=4000,
        system=system_prompt,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": user_prompt
                    },
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": "image/png", # change to image/jpeg if needed
                            "data": base64_image
                        }
                    }
                ]
            }
        ]
    )
    
    # 4. Extract generated code blocks and save them to your workspace
    print("\n✨ Migration complete! Writing your new React application files...")
    parse_and_save_agent_output(response.content[0].text, output_dir)

def parse_and_save_agent_output(text_content, output_dir):
    """Simple parser to read markdown code blocks and save them to local directories."""
    os.makedirs(output_dir, exist_ok=True)
    
    # Simple block parsing simulation
    blocks = text_content.split("```")
    current_filename = None
    
    for block in blocks:
        lines = block.strip().split("\n")
        if not lines:
            continue
            
        header = lines[0].lower()
        # Look for targeted component signatures
        if "jsx" in header or "js" in header or "css" in header:
            # Check if agent hinted at the filename in the text right before or on the first line
            if "app.jsx" in block or "App.jsx" in block:
                current_filename = "App.jsx"
            elif "calendar.jsx" in block or "Calendar.jsx" in block:
                current_filename = "Calendar.jsx"
            elif "home.jsx" in block or "Home.jsx" in block:
                current_filename = "Home.jsx"
            elif "sync.jsx" in block or "Sync.jsx" in block:
                current_filename = "Sync.jsx"
            else:
                continue
                
            code_content = "\n".join(lines[1:])
            target_path = os.path.join(output_dir, current_filename)
            
            with open(target_path, "w", encoding="utf-8") as f:
                f.write(code_content)
            print(filename_log := f"  ✅ Saved: {target_path}")
            
    print(f"\n🚀 Files are ready in '{output_dir}'. Code is fully scaffolded.")

# --- Execution Entrypoint ---
if __name__ == "__main__":
    # Adjust these file paths to match your actual folders
    HTML_REFERENCE = "./reference/index.html"
    IMAGE_REFERENCE = "./reference/screenshot.png" 
    
    run_migration_agent(HTML_REFERENCE, IMAGE_REFERENCE)