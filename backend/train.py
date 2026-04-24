"""
Dataset structure required:

dataset/
  real/   ← real face images
  fake/   ← deepfake/AI-generated images
"""

import torch
import torch.nn as nn
import torch.optim as optim
from torchvision import transforms, datasets
from torch.utils.data import DataLoader, random_split
import timm
from pathlib import Path
import argparse
import os

try:
    from tqdm import tqdm
except:
    tqdm = None


# ---------------- MODEL ----------------
def build_model():
    model = timm.create_model("efficientnet_b4", pretrained=True)

    in_features = model.classifier.in_features
    model.classifier = nn.Sequential(
        nn.Linear(in_features, 256),
        nn.ReLU(),
        nn.Dropout(0.3),
        nn.Linear(256, 2)
    )

    # Freeze backbone
    for param in model.parameters():
        param.requires_grad = False

    for param in model.classifier.parameters():
        param.requires_grad = True

    return model


# ---------------- DATA ----------------
def get_dataloaders(real_dir, fake_dir):
    base_dir = Path("dataset_combined")
    real_path = base_dir / "real"
    fake_path = base_dir / "fake"

    real_path.mkdir(parents=True, exist_ok=True)
    fake_path.mkdir(parents=True, exist_ok=True)

    # Copy images (Windows-safe)
    if len(list(real_path.glob("*"))) == 0:
        for img in Path(real_dir).glob("*"):
            os.system(f'copy "{img}" "{real_path}"')

    if len(list(fake_path.glob("*"))) == 0:
        for img in Path(fake_dir).glob("*"):
            os.system(f'copy "{img}" "{fake_path}"')

    transform_train = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.RandomHorizontalFlip(),
        transforms.RandomRotation(15),
        transforms.ColorJitter(brightness=0.3, contrast=0.3),
        transforms.ToTensor(),
        transforms.Normalize([0.485,0.456,0.406],[0.229,0.224,0.225])
    ])

    transform_val = transforms.Compose([
        transforms.Resize((224,224)),
        transforms.ToTensor(),
        transforms.Normalize([0.485,0.456,0.406],[0.229,0.224,0.225])
    ])

    dataset = datasets.ImageFolder(base_dir, transform=transform_train)

    train_size = int(0.8 * len(dataset))
    val_size = len(dataset) - train_size

    train_dataset, val_dataset = random_split(dataset, [train_size, val_size])
    val_dataset.dataset.transform = transform_val

    train_loader = DataLoader(train_dataset, batch_size=16, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=16)

    return train_loader, val_loader


# ---------------- TRAIN ----------------
def train(model, train_loader, val_loader, epochs, device, output_path):
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.AdamW(model.classifier.parameters(), lr=1e-4, weight_decay=1e-4)

    best_acc = 0.0
    model.to(device)

    for epoch in range(epochs):
        model.train()
        running_loss = 0

        loop = train_loader
        if tqdm:
            loop = tqdm(train_loader)

        for i, (images, labels) in enumerate(loop):
            images, labels = images.to(device), labels.to(device)

            outputs = model(images)
            loss = criterion(outputs, labels)

            optimizer.zero_grad()
            loss.backward()
            optimizer.step()

            running_loss += loss.item()

            if i % 10 == 0:
                print(f"Epoch {epoch+1}, Batch {i}, Loss: {loss.item():.4f}")

        # -------- VALIDATION --------
        model.eval()
        correct = 0
        total = 0

        with torch.no_grad():
            for images, labels in val_loader:
                images, labels = images.to(device), labels.to(device)
                outputs = model(images)
                _, preds = torch.max(outputs, 1)

                correct += (preds == labels).sum().item()
                total += labels.size(0)

        acc = correct / total
        print(f"Epoch {epoch+1}: Loss {running_loss:.3f}, Val Acc {acc*100:.2f}%")

        if acc > best_acc:
            best_acc = acc
            torch.save(model.state_dict(), output_path)

    print(f"Training complete. Best accuracy: {best_acc*100:.2f}%")


# ---------------- MAIN ----------------
if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--real_dir", required=True)
    parser.add_argument("--fake_dir", required=True)
    parser.add_argument("--output_path", required=True)
    parser.add_argument("--epochs", type=int, default=5)

    args = parser.parse_args()

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    model = build_model()
    train_loader, val_loader = get_dataloaders(args.real_dir, args.fake_dir)

    train(model, train_loader, val_loader, args.epochs, device, args.output_path)