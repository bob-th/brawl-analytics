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