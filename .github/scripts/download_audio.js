const fs = require('fs');
const https = require('https');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../../data.json');
const AUDIO_DIR = path.join(__dirname, '../../assets/audio');

if (!fs.existsSync(AUDIO_DIR)) {
    fs.mkdirSync(AUDIO_DIR, { recursive: true });
}

function extractDriveId(url) {
    if (!url) return null;
    const match = url.match(/(?:id=|\/d\/)([a-zA-Z0-9_-]{25,})/);
    return match ? match[1] : (url.length > 25 && !url.includes('/') ? url : null);
}

function downloadFile(id, destPath) {
    return new Promise((resolve, reject) => {
        if (fs.existsSync(destPath)) {
            console.log(`Skipping existing file: ${destPath}`);
            return resolve(false); // Didn't need to download
        }

        const url = `https://drive.google.com/uc?export=download&id=${id}`;
        console.log(`Downloading ${id} to ${destPath}...`);
        
        const file = fs.createWriteStream(destPath);
        file.on('error', (err) => {
            console.error(`File stream error for ${id}:`, err);
            fs.unlink(destPath, () => {});
            reject(err);
        });
        
        let redirectCount = 0;
        const request = (downloadUrl) => {
            if (redirectCount > 5) {
                file.close();
                fs.unlink(destPath, () => {});
                return reject(new Error(`Failed to download ${id}: Too many redirects`));
            }
            redirectCount++;

            https.get(downloadUrl, (response) => {
                // Handle redirects
                if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 303) {
                    let location = response.headers.location;
                    if (location.startsWith('/')) {
                        const urlObj = new URL(downloadUrl);
                        location = urlObj.origin + location;
                    }
                    return request(location);
                }
                
                if (response.statusCode !== 200) {
                    file.close();
                    fs.unlink(destPath, () => {}); // Delete the file async
                    return reject(new Error(`Failed to download ${id}: Status ${response.statusCode}`));
                }

                response.pipe(file);
                file.on('finish', () => {
                    file.close(() => resolve(true));
                });
            }).on('error', (err) => {
                file.close();
                fs.unlink(destPath, () => {});
                reject(err);
            });
        };
        
        request(url);
    });
}

async function processData() {
    console.log("Reading data.json...");
    if (!fs.existsSync(DATA_FILE)) {
        console.log("data.json not found, exiting.");
        return;
    }
    
    let rawData = fs.readFileSync(DATA_FILE, 'utf8');
    let data;
    try {
        data = JSON.parse(rawData);
    } catch(e) {
        console.error("Failed to parse data.json:", e);
        return;
    }

    let downloadPromises = [];
    let modified = false;

    // Process Standalone Audio Tracks
    if (data.audio && Array.isArray(data.audio)) {
        data.audio.forEach(track => {
            let driveId = extractDriveId(track.url) || extractDriveId(track.file);
            if (driveId) {
                const filename = `${driveId}.mp3`;
                const destPath = path.join(AUDIO_DIR, filename);
                const publicUrl = `assets/audio/${filename}`;
                
                downloadPromises.push(downloadFile(driveId, destPath));
                track.url = publicUrl;
                track.file = publicUrl;
                modified = true;
            }
        });
    }

    // Process Magazine Audio
    if (data.magazine && Array.isArray(data.magazine)) {
        data.magazine.forEach(issue => {
            if (issue.pages && Array.isArray(issue.pages)) {
                issue.pages.forEach(page => {
                    if (page.audioUrl && !page.audioUrl.startsWith('assets/audio/')) {
                        let driveId = extractDriveId(page.audioUrl);
                        if (driveId) {
                            const filename = `${driveId}.mp3`;
                            const destPath = path.join(AUDIO_DIR, filename);
                            const publicUrl = `assets/audio/${filename}`;
                            
                            downloadPromises.push(downloadFile(driveId, destPath));
                            page.audioUrl = publicUrl;
                            modified = true;
                        }
                    }
                });
            }
        });
    }

    if (downloadPromises.length > 0) {
        console.log(`Found ${downloadPromises.length} audio files to process.`);
        try {
            await Promise.all(downloadPromises);
            console.log("All audio files processed successfully.");
        } catch(e) {
            console.error("Error downloading some audio files:", e);
        }
    } else {
        console.log("No new audio files found.");
    }

    if (modified) {
        console.log("Saving updated data.json...");
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    }
}

processData();
