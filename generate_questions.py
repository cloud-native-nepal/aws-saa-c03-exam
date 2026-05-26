import re
import json
import os
import pypdf

pdf_path = "/Users/logpoint/Developer/AWS-Certified-Solutions-Architect-Associate-SAA-C03-Exam-Dump-With-Solution/AWS Certified Solutions Architect Associate SAA-C03.pdf"
txt_path = "/Users/logpoint/Developer/AWS-Certified-Solutions-Architect-Associate-SAA-C03-Exam-Dump-With-Solution/AWS SAA-03 Solution.txt"
output_path = "/Users/logpoint/Developer/AWS-Certified-Solutions-Architect-Associate-SAA-C03-Exam-Dump-With-Solution/src/data/questions.json"

def clean_text(text):
    text = text.replace('\xa0', ' ')
    # Fix ligatures and common spacing issues in PDF text
    text = re.sub(r'con\s+gure', 'configure', text, flags=re.IGNORECASE)
    text = re.sub(r'con\s+guring', 'configuring', text, flags=re.IGNORECASE)
    text = re.sub(r'con\s+gured', 'configured', text, flags=re.IGNORECASE)
    text = re.sub(r'tra\s+c', 'traffic', text, flags=re.IGNORECASE)
    text = re.sub(r'log\s+les', 'log files', text, flags=re.IGNORECASE)
    text = re.sub(r'de\s+ne', 'define', text, flags=re.IGNORECASE)
    text = re.sub(r'de\s+ned', 'defined', text, flags=re.IGNORECASE)
    text = re.sub(r'identi\s+er', 'identifier', text, flags=re.IGNORECASE)
    text = re.sub(r'speci\s+c', 'specific', text, flags=re.IGNORECASE)
    text = re.sub(r's\s+cient', 'sufficient', text, flags=re.IGNORECASE)
    text = re.sub(r'e\s+cient', 'efficient', text, flags=re.IGNORECASE)
    text = re.sub(r'e\s+ciency', 'efficiency', text, flags=re.IGNORECASE)
    text = re.sub(r'noti\s+cation', 'notification', text, flags=re.IGNORECASE)
    text = re.sub(r'noti\s+cations', 'notifications', text, flags=re.IGNORECASE)
    text = re.sub(r'high\s+availability', 'high availability', text, flags=re.IGNORECASE)
    text = re.sub(r'securi\s+ty', 'security', text, flags=re.IGNORECASE)
    text = re.sub(r'classi\s+cation', 'classification', text, flags=re.IGNORECASE)
    text = re.sub(r'multi\s+ple', 'multiple', text, flags=re.IGNORECASE)
    text = re.sub(r'solu\s+tion', 'solution', text, flags=re.IGNORECASE)
    text = re.sub(r'appli\s+cation', 'application', text, flags=re.IGNORECASE)
    text = re.sub(r'appli\s+cations', 'applications', text, flags=re.IGNORECASE)
    text = re.sub(r'databa\s+se', 'database', text, flags=re.IGNORECASE)
    text = re.sub(r'[\s\x00-\x08\x0b\x0c\x0e-\x1f\x7f]+', ' ', text)
    return text.strip()

print("Reading PDF...")
reader = pypdf.PdfReader(pdf_path)
pdf_text = ""
for i, page in enumerate(reader.pages):
    pdf_text += f"\n--- PAGE {i+1} ---\n" + page.extract_text()

print("Reading TXT...")
with open(txt_path, "r", encoding="utf-8") as f:
    txt_content = f.read()

# Parse PDF questions
matches = list(re.finditer(r"(?:Topic\s*\d+)?\s*Question\s*#\s*(\d+)", pdf_text))
pdf_questions = []

for i, match in enumerate(matches):
    q_num = int(match.group(1))
    start_pos = match.end()
    end_pos = matches[i+1].start() if i+1 < len(matches) else len(pdf_text)
    block_text = pdf_text[start_pos:end_pos].strip()
    
    # Extract options
    option_matches = list(re.finditer(r"(?:^|\n)\s*([A-F])\.\s+", block_text))
    question_text = ""
    options = {}
    if option_matches:
        question_text = block_text[:option_matches[0].start()].strip()
        for idx, opt_match in enumerate(option_matches):
            opt_letter = opt_match.group(1)
            opt_start = opt_match.end()
            opt_end = option_matches[idx+1].start() if idx+1 < len(option_matches) else len(block_text)
            opt_text = block_text[opt_start:opt_end].strip()
            # Clean up
            opt_text = clean_text(opt_text)
            opt_text = re.sub(r'---\s*PAGE\s*\d+\s*---', '', opt_text)
            opt_text = re.sub(r'Topic\s*\d+\s*-\s*Exam\s*[A-Z]', '', opt_text)
            opt_text = re.sub(r'\s+', ' ', opt_text).strip()
            options[opt_letter] = opt_text
    else:
        question_text = block_text
        
    question_text = clean_text(question_text)
    question_text = re.sub(r'---\s*PAGE\s*\d+\s*---', '', question_text)
    question_text = re.sub(r'Topic\s*\d+\s*-\s*Exam\s*[A-Z]', '', question_text)
    question_text = re.sub(r'\s+', ' ', question_text).strip()
    
    pdf_questions.append({
        "number": q_num,
        "question": question_text,
        "options": options
    })

# Parse TXT blocks
txt_matches = list(re.finditer(r"(?:^|\n)\s*(\d+)\s*[\]\.]", txt_content))
txt_blocks = []

for i, match in enumerate(txt_matches):
    txt_q_num = int(match.group(1))
    start_pos = match.end()
    end_pos = txt_matches[i+1].start() if i+1 < len(txt_matches) else len(txt_content)
    block_text = txt_content[start_pos:end_pos].strip()
    
    txt_blocks.append({
        "number_in_txt": txt_q_num,
        "raw_text": block_text,
        "norm_text": clean_text(block_text)
    })

# Match them up
matched_questions = []

for pdf_q in pdf_questions:
    q_num = pdf_q["number"]
    q_text = pdf_q["question"]
    sig = re.sub(r'[^a-z0-9]', '', q_text.lower())[:80]
    
    best_block = None
    best_score = 0
    
    # Try exact signature
    for block in txt_blocks:
        block_sig = re.sub(r'[^a-z0-9]', '', block["norm_text"].lower())
        if sig in block_sig:
            best_block = block
            best_score = 1.0
            break
            
    # Fuzzy fallback
    if best_score < 1.0:
        q_words = set(re.findall(r'\b\w{4,}\b', q_text.lower()))
        for block in txt_blocks:
            block_words = set(re.findall(r'\b\w{4,}\b', block["norm_text"].lower()))
            if not q_words:
                continue
            overlap = len(q_words.intersection(block_words)) / len(q_words)
            if overlap > best_score:
                best_score = overlap
                best_block = block
                
    correct_answers = []
    explanation = ""
    
    if best_score > 0.4:
        txt_block_raw = best_block["raw_text"]
        explanation = txt_block_raw
        
        # Method A: Look for "Correct answer <letters>:"
        ans_match = re.search(r"Correct\s*answer\s*([A-F](?:\s*,\s*[A-F]|\s*and\s*[A-F])*)", txt_block_raw, re.IGNORECASE)
        if ans_match:
            correct_answers = re.findall(r"[A-F]", ans_match.group(1).upper())
            
        # Method B: Check if option text appears in the TXT block
        if not correct_answers:
            for opt_letter, opt_val in pdf_q["options"].items():
                opt_val_clean = re.sub(r'[^a-z0-9]', '', opt_val.lower())
                if len(opt_val_clean) > 10:
                    if opt_val_clean in re.sub(r'[^a-z0-9]', '', txt_block_raw.lower()):
                        correct_answers.append(opt_letter)
                else:
                    if opt_val.lower() in txt_block_raw.lower():
                        correct_answers.append(opt_letter)
                        
        # Method C: Check for any leading letters
        if not correct_answers:
            txt_opt_matches = re.findall(r"(?:^|\n)\s*([A-F])\b", txt_block_raw)
            if txt_opt_matches:
                correct_answers = list(set(txt_opt_matches))
                
        correct_answers = sorted(list(set(correct_answers)))
        
    # Manual overrides for unmatched or tricky ones
    manual_overrides = {
        196: (["D"], "Use DynamoDB TTL to automatically delete items older than 30 days. Option D is correct."),
        197: (["B", "E"], "Rehost in Elastic Beanstalk .NET and use Oracle on Amazon RDS Multi-AZ. Options B and E are correct."),
        198: (["D"], "Use Amazon EKS with Fargate and Amazon DocumentDB. Option D is correct."),
        207: (["D"], "Use Amazon SQS and Lambda to buffer writes to DynamoDB. Option D is correct."),
        210: (["D"], "Scale Auto Scaling groups based on SQS backlog per instance metric. Option D is correct."),
        283: (["D"], "Use Amazon FSx for NetApp ONTAP for concurrent NFS/SMB access. Option D is correct."),
        494: (["D"], "Access is denied because request doesn't come from allowed CIDR ranges. Option D is correct."),
        569: (["A"], "Check for EventBridge metrics in CloudWatch under namespace AWS/Events. Option A is correct.")
    }
    
    if q_num in manual_overrides:
        correct_answers, explanation = manual_overrides[q_num]
        
    # Clean up explanation text (remove original question if duplicated)
    explanation = re.sub(r"^\d+\s*\][^\n]*\n?", "", explanation).strip()
    explanation = re.sub(r"^\d+\.[^\n]*\n?", "", explanation).strip()
    
    matched_questions.append({
        "number": q_num,
        "question": q_text,
        "options": pdf_q["options"],
        "correct_answers": correct_answers,
        "explanation": explanation or "No explanation available."
    })

# Double check that we have answers for everything
unresolved = 0
for q in matched_questions:
    if not q["correct_answers"]:
        unresolved += 1
        q["correct_answers"] = ["A"] # Fallback to avoid crashes

print(f"Total processed questions: {len(matched_questions)}")
print(f"Unresolved correct answers fallback applied to: {unresolved}")

# Save JSON
os.makedirs(os.path.dirname(output_path), exist_ok=True)
with open(output_path, "w", encoding="utf-8") as f:
    json.dump(matched_questions, f, indent=2)

print(f"Final parsed questions JSON generated successfully at: {output_path}")
