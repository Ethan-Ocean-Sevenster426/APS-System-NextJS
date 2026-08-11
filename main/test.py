from PIL import Image, ImageDraw, ImageFont
import os

# Desktop path
desktop = os.path.join(os.path.expanduser("~"), "Desktop")
output = os.path.join(desktop, "YouTube_Button.png")

# Create image
width, height = 600, 300
img = Image.new("RGB", (width, height), (30, 30, 30))
draw = ImageDraw.Draw(img)

# Red button
draw.rounded_rectangle((100, 60, 500, 220), radius=40, fill=(255, 0, 0))

# White play icon
draw.polygon([(245, 105), (245, 175), (330, 140)], fill="white")

# Text
try:
    font = ImageFont.truetype("arial.ttf", 28)
except:
    font = ImageFont.load_default()

draw.text((185, 235), "Open YouTube", fill="white", font=font)

# Save to Desktop
img.save(output)

print(f"Image created successfully:\n{output}")