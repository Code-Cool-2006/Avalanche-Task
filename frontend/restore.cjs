const fs = require('fs');
const path = require('path');

const brainsDir = path.join(process.env.HOME, '.gemini/antigravity/brain');
const conversations = [
  'f1da1bb8-8b4d-4e05-8a6a-dc26299ae32d', // foundation
  '2c9934b9-b858-4218-99ec-100c06e0cb55', // page designer
  '5c4a4e3c-4d94-4cbc-aaa2-eb3b327105b2'  // 3D designer
];

for (const convId of conversations) {
  const logPath = path.join(brainsDir, convId, '.system_generated/logs/transcript_full.jsonl');
  if (!fs.existsSync(logPath)) continue;
  
  const content = fs.readFileSync(logPath, 'utf-8');
  const lines = content.split('\n').filter(Boolean);
  
  for (const line of lines) {
    try {
      const parsed = JSON.parse(line);
      if (parsed.tool_calls) {
        for (const call of parsed.tool_calls) {
          if (call.name === 'write_to_file' || call.name === 'replace_file_content') {
             const targetFile = call.args.TargetFile;
             const code = call.args.CodeContent || call.args.ReplacementContent;
             if (targetFile && code) {
                fs.writeFileSync(targetFile, code);
                console.log('Restored', targetFile);
             }
          }
        }
      }
    } catch(e) {}
  }
}
