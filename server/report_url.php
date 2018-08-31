<?php
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
