"""
YOLOv8 Phone Detection Fine-Tuning Script
Fine-tunes yolov8n on COCO 'cell phone' class (class_id=67).
Falls back to pre-trained YOLOv8 with phone class filtering if no custom data.

Usage:
  python train_phone_yolov8.py               # pretrained (inference-ready)
  python train_phone_yolov8.py --train       # fine-tune on COCO phone subset
  python train_phone_yolov8.py --test-image path/to/image.jpg
"""

import sys
import argparse
import json
from pathlib import Path
import urllib.request

try:
    from ultralytics import YOLO
    YOLO_AVAILABLE = True
except ImportError:
    YOLO_AVAILABLE = False
    print("⚠️  ultralytics not installed. Run: pip install ultralytics")

ROOT = Path(__file__).parent.parent.parent
sys.path.insert(0, str(ROOT))

COCO_PHONE_CLASS_ID = 67
PHONE_YAML_CONTENT = """
# COCO Phone-Only Dataset Configuration
path: {dataset_path}
train: images/train
val:   images/val

nc: 1
names:
  0: cell_phone
"""


def create_phone_yaml(dataset_path: str, out_path: str) -> str:
    """Create YAML config for phone-only COCO fine-tuning."""
    content = PHONE_YAML_CONTENT.format(dataset_path=dataset_path)
    Path(out_path).parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, 'w') as f:
        f.write(content)
    return out_path


def download_coco_phone_subset(out_dir: str, max_images: int = 1000):
    """
    Download COCO val2017 images containing 'cell phone' class.
    Uses COCO API (pycocotools) if available, else downloads annotations directly.
    """
    import json, os, shutil
    from pathlib import Path

    out_path = Path(out_dir)
    (out_path / 'images' / 'train').mkdir(parents=True, exist_ok=True)
    (out_path / 'images' / 'val').mkdir(parents=True,   exist_ok=True)
    (out_path / 'labels' / 'train').mkdir(parents=True, exist_ok=True)
    (out_path / 'labels' / 'val').mkdir(parents=True,   exist_ok=True)

    # Download COCO annotations
    ann_url  = 'http://images.cocodataset.org/annotations/annotations_trainval2017.zip'
    ann_path = out_path / 'annotations_trainval2017.zip'
    if not ann_path.exists():
        print(f"📥 Downloading COCO annotations (~241MB)...")
        urllib.request.urlretrieve(ann_url, ann_path)
        import zipfile
        with zipfile.ZipFile(ann_path) as zf:
            zf.extractall(out_path)
        print("✅ Annotations extracted.")

    # Load annotations
    ann_file = out_path / 'annotations' / 'instances_val2017.json'
    with open(ann_file) as f:
        coco_data = json.load(f)

    # Get phone image IDs
    phone_ann  = [a for a in coco_data['annotations'] if a['category_id'] == 77]  # COCO phone=77
    image_ids  = list(set(a['image_id'] for a in phone_ann))[:max_images]
    id_to_info = {img['id']: img for img in coco_data['images']}

    print(f"🔍 Found {len(image_ids)} images with cell phones")

    # Download images and create YOLO-format labels
    base_url = 'http://images.cocodataset.org/val2017/'
    split_n  = int(len(image_ids) * 0.8)

    for i, img_id in enumerate(image_ids):
        info   = id_to_info[img_id]
        split  = 'train' if i < split_n else 'val'
        fname  = info['file_name']
        img_p  = out_path / 'images' / split / fname
        lbl_p  = out_path / 'labels' / split / (Path(fname).stem + '.txt')

        # Download image
        if not img_p.exists():
            try:
                urllib.request.urlretrieve(base_url + fname, img_p)
            except Exception as e:
                continue

        # Write YOLO label (class 0 = phone, normalized bbox)
        w, h     = info['width'], info['height']
        anns_img = [a for a in phone_ann if a['image_id'] == img_id]
        with open(lbl_p, 'w') as f:
            for ann in anns_img:
                x1, y1, bw, bh = ann['bbox']
                cx = (x1 + bw / 2) / w
                cy = (y1 + bh / 2) / h
                nw = bw / w
                nh = bh / h
                f.write(f"0 {cx:.6f} {cy:.6f} {nw:.6f} {nh:.6f}\n")

        if (i + 1) % 100 == 0:
            print(f"  Processed {i+1}/{len(image_ids)} images")

    print("✅ COCO phone dataset prepared.")
    return str(out_path)


def fine_tune(args):
    """Fine-tune YOLOv8n on phone class."""
    if not YOLO_AVAILABLE:
        return

    # Check for base model
    base_model_path = ROOT / 'inference' / 'yolov8n.pt'
    if not base_model_path.exists():
        print("📥 Downloading yolov8n.pt...")
        model = YOLO('yolov8n.pt')
    else:
        model = YOLO(str(base_model_path))

    # Prepare dataset
    dataset_dir = Path(args.data_dir)
    if not (dataset_dir / 'images' / 'train').exists():
        print(f"📥 Preparing COCO phone dataset → {dataset_dir}")
        download_coco_phone_subset(str(dataset_dir), max_images=args.max_images)

    yaml_path = str(dataset_dir / 'phone.yaml')
    create_phone_yaml(str(dataset_dir), yaml_path)

    # Fine-tune
    print(f"\n🚀 Starting YOLOv8 fine-tuning...")
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    results = model.train(
        data    = yaml_path,
        epochs  = args.epochs,
        imgsz   = 640,
        batch   = args.batch_size,
        lr0     = 0.001,
        lrf     = 0.01,
        patience= 10,
        project = str(out_dir),
        name    = 'phone_yolov8',
        verbose = True,
    )

    # Export best weights
    best_path = out_dir / 'phone_yolov8' / 'weights' / 'best.pt'
    final_path = out_dir / 'phone_yolov8_finetuned.pt'
    if best_path.exists():
        import shutil
        shutil.copy(best_path, final_path)
        print(f"✅ Fine-tuned model exported → {final_path}")

    return results


def evaluate_model(model_path: str, data_dir: str = None):
    """Evaluate fine-tuned phone detector (mAP@50, mAP@50-95)."""
    if not YOLO_AVAILABLE:
        return
    model = YOLO(model_path)
    yaml_path = Path(data_dir) / 'phone.yaml' if data_dir else None
    if yaml_path and yaml_path.exists():
        metrics = model.val(data=str(yaml_path))
        print(f"\n📊 PHONE DETECTION EVALUATION")
        print(f"  mAP@50:    {metrics.box.map50:.4f}")
        print(f"  mAP@50-95: {metrics.box.map:.4f}")
        print(f"  Precision: {metrics.box.mp:.4f}")
        print(f"  Recall:    {metrics.box.mr:.4f}")
        return metrics
    else:
        print("⚠️  No validation data found. Run with real dataset for mAP evaluation.")


def test_on_image(model_path: str, image_path: str, conf: float = 0.5):
    """Quick test on a single image."""
    if not YOLO_AVAILABLE:
        return
    model   = YOLO(model_path)
    results = model(image_path, conf=conf)
    result  = results[0]
    phones  = [b for b in result.boxes if int(b.cls) == 0]
    print(f"\n🔍 Phone Detection on {image_path}")
    print(f"   Phones detected: {len(phones)}")
    for i, b in enumerate(phones):
        print(f"   [{i+1}] confidence={float(b.conf):.4f}  bbox={b.xyxy[0].tolist()}")
    return len(phones) > 0


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='YOLOv8 Phone Detection Training')
    parser.add_argument('--train',      action='store_true', help='Fine-tune on COCO phone subset')
    parser.add_argument('--evaluate',   action='store_true', help='Evaluate mAP on val set')
    parser.add_argument('--test-image', type=str,   default=None, help='Test on single image')
    parser.add_argument('--data-dir',   type=str,   default='data/coco_phone')
    parser.add_argument('--out-dir',    type=str,   default='ai_models/phone/weights')
    parser.add_argument('--model-path', type=str,   default='ai_models/phone/weights/phone_yolov8_finetuned.pt')
    parser.add_argument('--epochs',     type=int,   default=30)
    parser.add_argument('--batch-size', type=int,   default=16)
    parser.add_argument('--max-images', type=int,   default=1000)
    parser.add_argument('--conf',       type=float, default=0.5)
    args = parser.parse_args()

    if args.train:
        fine_tune(args)
    elif args.evaluate:
        evaluate_model(args.model_path, args.data_dir)
    elif args.test_image:
        test_on_image(args.model_path, args.test_image, args.conf)
    else:
        print("⚠️  Specify --train, --evaluate, or --test-image")
        print("   For inference only, use phone_detector_v2.py directly.")
