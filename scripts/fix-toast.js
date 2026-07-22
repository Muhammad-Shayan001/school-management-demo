import fs from 'fs';
function fixFile(file) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/addToast\((.*?),\s*(['"](?:success|error|warning|info)['"])\)/g, 'addToast($2, $1)');
  
  content = content.replace(/addToast\((['`"][^,]+?['`"])\)/g, (match, p1) => {
    let type = 'info';
    if (p1.toLowerCase().includes('error') || p1.toLowerCase().includes('fail')) type = 'error';
    else if (p1.toLowerCase().includes('success') || p1.toLowerCase().includes('saved') || p1.toLowerCase().includes('published') || p1.toLowerCase().includes('submitted')) type = 'success';
    else if (p1.toLowerCase().includes('please') || p1.toLowerCase().includes('first')) type = 'warning';
    return `addToast('${type}', ${p1})`;
  });
  
  fs.writeFileSync(file, content);
}
fixFile('src/components/StudentDashboardView.tsx');
fixFile('src/components/TeacherDashboardView.tsx');
fixFile('src/components/ApprovalsView.tsx');
