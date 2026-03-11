import os
import shutil

# Folder path to organize
source_folder = "C:/Users/YourName/Downloads"

# File type categories
file_types = {
    "Images": [".jpg", ".jpeg", ".png", ".gif"],
    "Videos": [".mp4", ".mkv", ".avi"],
    "Documents": [".pdf", ".docx", ".txt", ".pptx", ".xlsx"],
    "Music": [".mp3", ".wav"],
    "Programs": [".exe", ".msi"]
}

# Create folders if not exist
for folder in file_types.keys():
    folder_path = os.path.join(source_folder, folder)
    os.makedirs(folder_path, exist_ok=True)

# Other folder
other_folder = os.path.join(source_folder, "Others")
os.makedirs(other_folder, exist_ok=True)

# Scan files
for file in os.listdir(source_folder):

    file_path = os.path.join(source_folder, file)

    if os.path.isfile(file_path):

        moved = False

        for folder, extensions in file_types.items():

            for ext in extensions:

                if file.lower().endswith(ext):

                    shutil.move(file_path,
                                os.path.join(source_folder, folder, file))

                    moved = True
                    break

            if moved:
                break

        if not moved:
            shutil.move(file_path,
                        os.path.join(other_folder, file))

print("Files organized successfully!")