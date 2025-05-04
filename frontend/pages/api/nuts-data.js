import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  const { level = '2' } = req.query;
  
  try {
    // Path to the NUTS data file
    // Store this file in a non-public directory to prevent direct access
    const filePath = path.join(process.cwd(), 'data', 'nutsRegions.csv');
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'NUTS data file not found' });
    }
    
    // Read the file
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    // Set appropriate headers
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Cache-Control', 'max-age=3600'); // Cache for 1 hour
    
    // Return the file content
    res.status(200).send(fileContent);
  } catch (error) {
    console.error('Error serving NUTS data:', error);
    res.status(500).json({ error: 'Failed to serve NUTS data' });
  }
}
