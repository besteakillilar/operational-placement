
const fs = require('fs');

const stylesPath = 'c:\\Users\\Beste\\Desktop\\Projects\\operational-placement-main\\operational-placement-main\\styles.css';
const dropdownPath = 'c:\\Users\\Beste\\Desktop\\Projects\\operational-placement-main\\operational-placement-main\\styles_dropdown.css';

try {
    let styles = fs.readFileSync(stylesPath, 'utf8');
    const dropdown = fs.readFileSync(dropdownPath, 'utf8');

    // Find the marker line
    const marker = 'background: rgba(245, 158, 11, 0.1);';
    const idx = styles.lastIndexOf(marker);

    if (idx !== -1) {
        // Find the next '}' after marker
        const braceIdx = styles.indexOf('}', idx);

        if (braceIdx !== -1) {
            // Keep content up to "}"
            // But wait, the file might currently have the "good" dropdown css appended AFTER the garbage line.
            // The previous view_file (Step 492) showed:
            // 3651: }/ * ...
            // 3652: 
            // 3653: /* ==================== CUSTOM SEARCHABLE DROPDOWN ...

            // So if I cut at braceIdx, I lose the ALREADY appended good css.
            // That's fine, I have it in `dropdown` variable (read from styles_dropdown.css).

            const cleanStyles = styles.substring(0, braceIdx + 1);
            const finalStyles = cleanStyles + '\n\n' + dropdown;

            fs.writeFileSync(stylesPath, finalStyles, 'utf8');
            console.log('Fixed styles.css successfully');
        } else {
            console.log('Could not find closing brace after marker');
        }
    } else {
        console.log('Could not find marker in file');
    }
} catch (e) {
    console.error('Error:', e);
}
