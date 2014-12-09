# mp3skull
Search and stream music from mp3skull.

## Installation

    $ npm install mp3skull

## Example
```javascript
var fs = require('fs'),
    mp3skull = require('mp3skull');

mp3skull('the beatles hello goodbye', function (err, tracks) {
    tracks[0].song.pipe(fs.createWriteStream('hello goodbye.mp3'));
});
```

## API
### track
```javascript
{
    track: String, // the track name as it appears on the website
    direct: String, // the direct MP3 url to the track
    song: ReadableStream, // a lazy readable stream of direct
    duration: Number?, // the duration of the track in seconds
    bitrate: Number?, // the bitrate of the track in kbps
    size: Number? // the size of the track in bytes
}
```

*Note that the fields marked with ? suffixed may be undefined for certain tracks.*

### mp3skull(terms, [options], done)
Search MP3 tracks on mp3skull.

`terms` is expected to be a string of terms to search for.

`options` is an optional object that's passed into the *needle* requests.

`done` returns an array of `tracks`.

## License
MIT
