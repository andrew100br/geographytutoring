// Supabase Storage rejects certain characters in object keys with a flat
// "Invalid key" error — confirmed empirically that square brackets fail
// (e.g. filenames from scanning/notes apps that embed a bracketed timestamp,
// like "Page 1-[1787486571781].pdf"), while spaces, hyphens, underscores,
// and dots are all fine. Rather than chase every bad character one at a
// time, keep only characters already known to be safe.
function sanitizeFileName(name) {
    const dot = name.lastIndexOf('.');
    const base = dot > 0 ? name.slice(0, dot) : name;
    const ext = dot > 0 ? name.slice(dot + 1).replace(/[^a-zA-Z0-9]/g, '') : '';
    const cleanBase = base.replace(/[^a-zA-Z0-9 _.-]/g, '-').trim() || 'file';
    return ext ? `${cleanBase}.${ext}` : cleanBase;
}

module.exports = { sanitizeFileName };
