// Brawl Stars tags are '#' followed by alphanumeric (uppercase + digits).
// Accept with or without the leading '#'.
const TAG_RE = /^#?[0-9A-Z]{4,12}$/i;

export function isValidTag(playerTag) {
    return typeof playerTag === 'string' && TAG_RE.test(playerTag);
}

export function prefixTag (playerTag) {
    return playerTag.startsWith('#') ? playerTag : `#${playerTag}`;
}

export function prefixTagURLEncoded(playerTag) {
    if (playerTag.startsWith('%23')) return playerTag; 
    return playerTag.startsWith('#') ? `%23${playerTag.slice(1)}` : `%23${playerTag}`;
}

export function stripTag (playerTag) {
    return !playerTag.startsWith('#') ? playerTag : `#${playerTag}`;
}