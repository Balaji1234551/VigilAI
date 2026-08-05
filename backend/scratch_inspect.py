from ultralytics import YOLO
model = YOLO('C:/Users/kurub/OneDrive/Desktop/Vigilai/backend/app/models/best.pt')
print('--- best.pt ---')
print('Classes:', len(model.names))
for k, v in model.names.items():
    print(f' - {v}')
