/*
* A JavaScript implementation of the SHA256 hash function.
*
* FILE:    sha256.jquery.debug.js
* VERSION:	1.0
*
* MODIFICATION BY:  Jacob Bair <orso.zed@gmail.com>
* ORIGINAL AUTHOR:	Christoph Bichlmeier <informatik@zombiearena.de>
*
* NOTE: This version is not tested thoroughly!
*
* Copyright (c) 2003, Christoph Bichlmeier
* All rights reserved.
*
* Redistribution and use in source and binary forms, with or without
* modification, are permitted provided that the following conditions
* are met:
* 1. Redistributions of source code must retain the above copyright
*    notice, this list of conditions and the following disclaimer.
* 2. Redistributions in binary form must reproduce the above copyright
*    notice, this list of conditions and the following disclaimer in the
*    documentation and/or other materials provided with the distribution.
* 3. Neither the name of the copyright holder nor the names of contributors
*    may be used to endorse or promote products derived from this software
*    without specific prior written permission.
*
* ======================================================================
*
* THIS SOFTWARE IS PROVIDED BY THE AUTHORS ''AS IS'' AND ANY EXPRESS
* OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
* WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
* ARE DISCLAIMED.  IN NO EVENT SHALL THE AUTHORS OR CONTRIBUTORS BE
* LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
* CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
* SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR
* BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
* WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE
* OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
* EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/
(function($) {
    $.sha256 = function(data) {
        var ihash, count, buffer;
        var hex_digits = "0123456789abcdef";
        
        /* Hash constant words K: */
        var K256 = new Array(
            0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5,
            0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
            0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
            0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
            0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
            0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
            0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
            0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
            0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
            0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
            0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3,
            0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
            0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5,
            0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
            0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
            0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
        );
        
        var rotateRight = function(n, x) {
            return ((x >>> n) | (x << (32 - n)));
        };
        
        var choice = function(x, y, z) {
            return ((x & y) ^ (~x & z));
        };
        
        var majority = function(x, y, z) {
            return ((x & y) ^ (x & z) ^ (y & z));
        };
        
        var Sigma0 = function(x) {
            return (rotateRight(2, x) ^ rotateRight(13, x) ^ rotateRight(22, x));
        };
        
        var Sigma1 = function(x) {
            return (rotateRight(6, x) ^ rotateRight(11, x) ^ rotateRight(25, x));
        };
        
        var sigma0 = function(x) {
            return (rotateRight(7, x) ^ rotateRight(18, x) ^ (x >>> 3));
        };
        
        var sigma1 = function(x) {
            return (rotateRight(17, x) ^ rotateRight(19, x) ^ (x >>> 10));
        };
        
        var expand = function(W, j) {
            return (W[j & 0x0f] += sigma1(W[(j + 14) & 0x0f]) + W[(j + 9) & 0x0f] + sigma0(W[(j + 1) & 0x0f]));
        };
        
        var safe_add = function (x, y) {
            var lsw = (x & 0xffff) + (y & 0xffff);
            var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
            return (msw << 16) | (lsw & 0xffff);
        };
        
        var init = function() {
            ihash = new Array(8);
            count = new Array(2);
            buffer = new Array(64);
            count[0] = count[1] = 0;
            ihash[0] = 0x6a09e667;
            ihash[1] = 0xbb67ae85;
            ihash[2] = 0x3c6ef372;
            ihash[3] = 0xa54ff53a;
            ihash[4] = 0x510e527f;
            ihash[5] = 0x9b05688c;
            ihash[6] = 0x1f83d9ab;
            ihash[7] = 0x5be0cd19;
        };
        
        var update = function(data, length) {
            var index, curpos = 0;
            
            /* Compute number of bytes mod 64 */
            index = ((count[0] >> 3) & 0x3f);
            var remainder = (length & 0x3f);
            
            /* Update number of bits */
            if ((count[0] += (length << 3)) < (length << 3)) {
                count[1]++;
            }
            count[1] += (length >> 29);
            
            /* Transform as many times as possible */
            for (var i = 0; i + 63 < length; i += 64) {
                for (var j = index; j < 64; j++) {
                    buffer[j] = data.charCodeAt(curpos++);
                }
                transform();
                index = 0;
            }
            
            /* Buffer remaining input */
            for (var k = 0; k < remainder; k++) {
                buffer[k] = data.charCodeAt(curpos++);
            }
        };
        
        var transform = function() {
            var a, b, c, d, e, f, g, h, T1, T2;
            var W = new Array(16);
            
            /* Initialize registers with the previous intermediate value */
            a = ihash[0];
            b = ihash[1];
            c = ihash[2];
            d = ihash[3];
            e = ihash[4];
            f = ihash[5];
            g = ihash[6];
            h = ihash[7];
            
            /* make 32-bit words */
            for (var i = 0; i < 16; i++) {
                W[i] = ((buffer[(i << 2) + 3]) | (buffer[(i << 2) + 2] << 8) | (buffer[(i << 2) + 1] << 16) | (buffer[i << 2] << 24));
            }
            
            for (var j = 0; j < 64; j++) {
                T1 = h + Sigma1(e) + choice(e, f, g) + K256[j];
                if (j < 16) {
                    T1 += W[j];
                } else {
                    T1 += expand(W, j);
                }
                T2 = Sigma0(a) + majority(a, b, c);
                h = g;
                g = f;
                f = e;
                e = safe_add(d, T1);
                d = c;
                c = b;
                b = a;
                a = safe_add(T1, T2);
            }
            
            /* Compute the current intermediate hash value */
            ihash[0] += a;
            ihash[1] += b;
            ihash[2] += c;
            ihash[3] += d;
            ihash[4] += e;
            ihash[5] += f;
            ihash[6] += g;
            ihash[7] += h;
        };
        
        var final = function() {
            var index = ((count[0] >> 3) & 0x3f);
            buffer[index++] = 0x80;
            
            if (index <= 56) {
                for (var i = index; i < 56; i++) {
                    buffer[i] = 0;
                }
            } else {
                for (var i = index; i < 64; i++) {
                    buffer[i] = 0;
                }
                
                transform();
                
                for (var i = 0; i < 56; i++) {
                    buffer[i] = 0;
                }
            }
            
            buffer[56] = (count[1] >>> 24) & 0xff;
            buffer[57] = (count[1] >>> 16) & 0xff;
            buffer[58] = (count[1] >>> 8) & 0xff;
            buffer[59] = count[1] & 0xff;
            buffer[60] = (count[0] >>> 24) & 0xff;
            buffer[61] = (count[0] >>> 16) & 0xff;
            buffer[62] = (count[0] >>> 8) & 0xff;
            buffer[63] = count[0] & 0xff;
            
            transform();
        };
        
        var encode = function() {
            var output = "";
            for (var i = 0; i < 8; i++) {
                for (var j = 28; j >= 0; j -= 4) {
                    output += hex_digits.charAt((ihash[i] >>> j) & 0x0f);
                }
            }
            return output;
        };
        
        if ($.isPlainObject(data) || $.isArray(data)) {
            data = JSON.stringify(data);
        }
        
        init();
        update(data, data.length);
        final();
        
        return encode();
    };
})(jQuery);        