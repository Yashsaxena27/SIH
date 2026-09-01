const fs = require('fs');

const replaceInFile = (file, replacements) => {
  let data = fs.readFileSync(file, 'utf8');
  for (const { search, replace } of replacements) {
    data = data.split(search).join(replace);
  }
  fs.writeFileSync(file, data);
};

// 1. Issues
replaceInFile('src/services/mock/issues.ts', [
  { search: 'class:', replace: 'detectionClass:' },
  { search: 'totalActive: 6,', replace: '' }
]);

// 2. Routes
replaceInFile('src/services/mock/routes.ts', [
  { search: 'const randomRoadName', replace: '// const randomRoadName' },
  { search: 'description:', replace: '// description:' }
]);

// 3. System
replaceInFile('src/services/mock/system.ts', [
  { search: 'status: "healthy",', replace: '' },
  { search: '"bus"', replace: '"system"' },
  { search: '"sla"', replace: '"performance"' },
  { search: '"anomaly"', replace: '"performance"' },
  { search: 'severity: "high"', replace: 'severity: "warning"' },
  { search: 'severity: "medium"', replace: 'severity: "info"' },
  { search: 'trend: "up",', replace: '' },
  { search: 'trend: "down",', replace: '' },
  { search: 'trend: "stable",', replace: '' },
  { search: 'description: ', replace: 'title: "Event", description: ' },
  { search: '"ticket_updated"', replace: '"ticket_assigned"' }
]);

// 4. Roads
replaceInFile('src/services/mock/roads.ts', [
  { search: 'length: ', replace: 'lengthKm: ' },
  { search: 'currentHealthScore: ', replace: 'healthScore: ' },
  { search: 'overallScore: 72,', replace: '' },
  { search: 'timestamp: ', replace: 'date: ' },
  { search: 'issueDensity: ', replace: 'defectCount: ' },
  { search: 'lastSurveyed: ', replace: 'roadType: "arterial", healthTrend: "stable", lastSurveyed: ' }
]);

console.log('Fixed simple mock types');
