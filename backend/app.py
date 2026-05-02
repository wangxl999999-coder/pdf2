from flask import Flask, request, send_file, jsonify
from flask_cors import CORS
from PyPDF2 import PdfReader, PdfWriter
import os
import uuid
from werkzeug.utils import secure_filename

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = 'uploads'
OUTPUT_FOLDER = 'outputs'
ALLOWED_EXTENSIONS = {'pdf'}

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['OUTPUT_FOLDER'] = OUTPUT_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def generate_unique_filename(original_name):
    ext = os.path.splitext(original_name)[1]
    unique_name = f"{uuid.uuid4().hex}{ext}"
    return unique_name

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "ok", "message": "PDF服务运行正常"})

@app.route('/api/upload', methods=['POST'])
def upload_file():
    try:
        if 'file' not in request.files:
            return jsonify({"success": False, "message": "没有选择文件"}), 400
        
        files = request.files.getlist('file')
        uploaded_files = []
        
        for file in files:
            if file.filename == '':
                continue
            if file and allowed_file(file.filename):
                secure_name = secure_filename(file.filename)
                unique_name = generate_unique_filename(secure_name)
                filepath = os.path.join(app.config['UPLOAD_FOLDER'], unique_name)
                file.save(filepath)
                
                try:
                    reader = PdfReader(filepath)
                    page_count = len(reader.pages)
                    uploaded_files.append({
                        "fileId": unique_name,
                        "filename": secure_name,
                        "pageCount": page_count,
                        "filepath": filepath
                    })
                except Exception as e:
                    os.remove(filepath)
                    return jsonify({"success": False, "message": f"文件 {secure_name} 不是有效的PDF文件"}), 400
        
        if not uploaded_files:
            return jsonify({"success": False, "message": "没有上传有效的PDF文件"}), 400
        
        return jsonify({
            "success": True,
            "message": f"成功上传 {len(uploaded_files)} 个文件",
            "files": uploaded_files
        })
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/merge', methods=['POST'])
def merge_pdfs():
    try:
        data = request.get_json()
        files = data.get('files', [])
        
        if not files or len(files) < 2:
            return jsonify({"success": False, "message": "至少需要选择2个PDF文件进行合并"}), 400
        
        merger = PdfWriter()
        output_filename = f"merged_{uuid.uuid4().hex}.pdf"
        output_path = os.path.join(app.config['OUTPUT_FOLDER'], output_filename)
        
        try:
            for file_info in files:
                file_id = file_info.get('fileId')
                if not file_id:
                    continue
                
                filepath = os.path.join(app.config['UPLOAD_FOLDER'], file_id)
                if not os.path.exists(filepath):
                    return jsonify({"success": False, "message": f"文件 {file_id} 不存在"}), 400
                
                reader = PdfReader(filepath)
                for page in reader.pages:
                    merger.add_page(page)
            
            with open(output_path, 'wb') as output_file:
                merger.write(output_file)
            
            merger.close()
            
            return jsonify({
                "success": True,
                "message": "PDF合并成功",
                "downloadUrl": f"/api/download/{output_filename}",
                "filename": "merged.pdf"
            })
        except Exception as e:
            if os.path.exists(output_path):
                os.remove(output_path)
            return jsonify({"success": False, "message": f"合并失败: {str(e)}"}), 500
        finally:
            merger.close()
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/page-info', methods=['POST'])
def get_page_info():
    try:
        data = request.get_json()
        file_id = data.get('fileId')
        
        if not file_id:
            return jsonify({"success": False, "message": "缺少文件ID"}), 400
        
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], file_id)
        if not os.path.exists(filepath):
            return jsonify({"success": False, "message": "文件不存在"}), 400
        
        reader = PdfReader(filepath)
        pages = []
        
        for i, page in enumerate(reader.pages):
            rotation = page.get('/Rotate', 0)
            if rotation is None:
                rotation = 0
            pages.append({
                "pageNum": i + 1,
                "rotation": rotation,
                "selected": True
            })
        
        return jsonify({
            "success": True,
            "totalPages": len(pages),
            "pages": pages
        })
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/process', methods=['POST'])
def process_pdf():
    try:
        data = request.get_json()
        file_id = data.get('fileId')
        operations = data.get('operations', [])
        
        if not file_id:
            return jsonify({"success": False, "message": "缺少文件ID"}), 400
        
        if not operations:
            return jsonify({"success": False, "message": "没有指定处理操作"}), 400
        
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], file_id)
        if not os.path.exists(filepath):
            return jsonify({"success": False, "message": "文件不存在"}), 400
        
        reader = PdfReader(filepath)
        writer = PdfWriter()
        
        page_count = len(reader.pages)
        page_map = {i + 1: i for i in range(page_count)}
        
        for op in operations:
            op_type = op.get('type')
            
            if op_type == 'rotate':
                page_num = op.get('pageNum')
                angle = op.get('angle', 90)
                if page_num and 1 <= page_num <= page_count:
                    idx = page_num - 1
                    page = reader.pages[idx]
                    current_rotation = page.get('/Rotate', 0) or 0
                    new_rotation = (current_rotation + angle) % 360
                    if new_rotation == 0:
                        page.rotate(0)
                    else:
                        page.rotate(new_rotation)
                        
            elif op_type == 'reorder':
                new_order = op.get('newOrder', [])
                if new_order:
                    valid_pages = [p for p in new_order if 1 <= p <= page_count]
                    if valid_pages:
                        for new_idx, page_num in enumerate(valid_pages):
                            page_map[page_num] = new_idx
        
        final_order = sorted(page_map.keys(), key=lambda x: page_map[x])
        
        selected_pages = set()
        for op in operations:
            if op.get('type') == 'select':
                selected_pages = set(op.get('pages', []))
                break
        
        if selected_pages:
            final_order = [p for p in final_order if p in selected_pages]
        
        if not final_order:
            return jsonify({"success": False, "message": "没有保留的页面"}), 400
        
        for page_num in final_order:
            idx = page_num - 1
            page = reader.pages[idx]
            writer.add_page(page)
        
        output_filename = f"processed_{uuid.uuid4().hex}.pdf"
        output_path = os.path.join(app.config['OUTPUT_FOLDER'], output_filename)
        
        with open(output_path, 'wb') as output_file:
            writer.write(output_file)
        
        return jsonify({
            "success": True,
            "message": "PDF处理成功",
            "downloadUrl": f"/api/download/{output_filename}",
            "filename": "processed.pdf",
            "totalPages": len(final_order)
        })
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/download/<filename>', methods=['GET'])
def download_file(filename):
    try:
        filepath = os.path.join(app.config['OUTPUT_FOLDER'], filename)
        if not os.path.exists(filepath):
            return jsonify({"success": False, "message": "文件不存在"}), 404
        
        return send_file(
            filepath,
            as_attachment=True,
            download_name=filename,
            mimetype='application/pdf'
        )
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/cleanup', methods=['POST'])
def cleanup_files():
    try:
        data = request.get_json()
        file_ids = data.get('fileIds', [])
        
        deleted_count = 0
        for file_id in file_ids:
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], file_id)
            if os.path.exists(filepath):
                os.remove(filepath)
                deleted_count += 1
        
        return jsonify({
            "success": True,
            "message": f"已清理 {deleted_count} 个文件"
        })
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
