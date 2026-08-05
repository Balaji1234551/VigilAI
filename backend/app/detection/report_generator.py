from fpdf import FPDF
import io
import datetime

class PDFReport(FPDF):
    def header(self):
        self.set_font('helvetica', 'B', 15)
        self.cell(0, 10, 'VigilAI Detection Report', border=False, ln=True, align='C')
        self.ln(5)

    def footer(self):
        self.set_y(-15)
        self.set_font('helvetica', 'I', 8)
        self.cell(0, 10, f'Page {self.page_no()}', 0, 0, 'C')

def generate_pdf_report(video_data: dict, alerts: list) -> bytes:
    pdf = PDFReport()
    pdf.add_page()
    
    # Title
    pdf.set_font('helvetica', 'B', 12)
    pdf.cell(0, 10, 'Video Details', ln=True)
    
    pdf.set_font('helvetica', '', 10)
    pdf.cell(0, 8, f"Video Name: {video_data.get('camera_name', 'Unknown')}", ln=True)
    pdf.cell(0, 8, f"Upload Date: {video_data.get('created_at', 'Unknown')}", ln=True)
    pdf.cell(0, 8, f"Processing Duration: {video_data.get('processing_duration', 0.0)} seconds", ln=True)
    pdf.cell(0, 8, f"Total Frames: {video_data.get('total_frames', 0)}", ln=True)
    pdf.cell(0, 8, f"Total Detections: {video_data.get('total_detections', 0)}", ln=True)
    
    pdf.ln(5)
    
    # Confidence Stats
    pdf.set_font('helvetica', 'B', 12)
    pdf.cell(0, 10, 'Confidence Statistics', ln=True)
    pdf.set_font('helvetica', '', 10)
    pdf.cell(0, 8, f"Average Confidence: {video_data.get('avg_confidence', 0.0):.2f}", ln=True)
    pdf.cell(0, 8, f"Max Confidence: {video_data.get('max_confidence', 0.0):.2f}", ln=True)
    pdf.cell(0, 8, f"Min Confidence: {video_data.get('min_confidence', 0.0):.2f}", ln=True)
    
    pdf.ln(5)
    
    # Object Counts
    pdf.set_font('helvetica', 'B', 12)
    pdf.cell(0, 10, 'Object Counts', ln=True)
    pdf.set_font('helvetica', '', 10)
    counts = video_data.get('object_counts', {})
    for obj, count in counts.items():
        pdf.cell(0, 8, f"{obj}: {count}", ln=True)
        
    pdf.ln(5)
    
    # Alert Timeline
    pdf.set_font('helvetica', 'B', 12)
    pdf.cell(0, 10, 'Detection Timeline (Anomalies)', ln=True)
    pdf.set_font('helvetica', '', 10)
    
    if not alerts:
        pdf.cell(0, 8, "No critical anomalies detected.", ln=True)
    else:
        for alert in alerts:
            ts = alert.get('timestamp', 'Unknown')
            type_ = alert.get('anomaly_type', 'Unknown')
            conf = alert.get('confidence', 0.0)
            pdf.cell(0, 8, f"[{ts}] {type_} detected (Confidence: {conf:.2f})", ln=True)
            
    pdf.ln(10)
    pdf.set_font('helvetica', 'I', 10)
    pdf.cell(0, 10, f"Generated automatically by VigilAI on {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", ln=True)
    
    # Output to bytes
    return pdf.output(dest='S')
