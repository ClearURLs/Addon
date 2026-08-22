/*
 * ClearURLs
 * Copyright (c) 2017-2025 Kevin Röbert
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

(function () {
    "use strict";

    const marker = "?target=";
    const markerIndex = window.location.href.indexOf(marker);
    if (markerIndex === -1) {
        return;
    }

    let target = window.location.href.slice(markerIndex + marker.length);
    try {
        for (let pass = 0; pass < 10; pass++) {
            const decoded = decodeURIComponent(target);
            if (decoded === target) {
                break;
            }
            target = decoded;
        }
    } catch (error) {
        console.error("[ClearURLs] Invalid redirect target:", error);
        return;
    }

    if (!/^https?:\/\//i.test(target)) {
        target = "http://" + target;
    }

    try {
        const destination = new URL(target);
        if (["http:", "https:"].includes(destination.protocol)) {
            window.location.replace(destination.href);
        }
    } catch (error) {
        console.error("[ClearURLs] Refused invalid redirect target:", error);
    }
}());
