<?php
/*
 * ClearURLs
 * Copyright (c) 2017-2020 Kevin Röbert
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

$servername = "...";
$username = "...";
$password = "...";
$dbname = "...";

if(isset($_GET['url'])) $url = urldecode($_GET['url']);
else http_response_code(404);

if(!empty($url) && filter_var($url, FILTER_VALIDATE_URL))
{
    $hash = md5($url);

    // Create connection
    $conn = new mysqli($servername, $username, $password, $dbname);
    // Check connection
    if ($conn->connect_error) {
        http_response_code(505);
    }

    $sql = "INSERT INTO reports (hash, url) VALUES ('$hash', '$url')";

    if ($conn->query($sql) === TRUE) {
        http_response_code(200);
    } else {
        http_response_code(500);
    }

    $conn->close();
}
else {
    http_response_code(505);
}

?>
