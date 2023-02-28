const https = require('https');
const { format } = require('path');

const startTime = process.argv[2];
const endTime = process.argv[3];
const url = `https://tsserv.tinkermode.dev/hourly?begin=${startTime}&end=${endTime}`


const hourlyBuckets = {};

let currentBucket = {
    hour: '',
    count: 0,
    sum: 0,
};

const formatBucket = function(bucket) {
    return `${bucket.hour} ${(bucket.sum / bucket.count).toFixed(4)}`;
}

// Can also use data.index('\n') and data.substring() to avoid split it at the beginning 
// and join it back at the end. It will also save some time and space。
const handleDataChunk = function (leftover, newdata) {
    let dataList = (leftover + newdata).split('\n');
    let index = 0;
    for (index = 0; index < dataList.length; index++) {
        [timestamp, value] = dataList[index].split(' ');
        if (timestamp.length == 20 && value) {
            let hour = timestamp.substring(0, 13) + ':00:00Z';
            if (currentBucket.hour == '') {
                // initialize
                currentBucket = {
                    hour: hour,
                    count: 1,
                    sum: parseFloat(value)
                };
            } else if (currentBucket.hour != hour) {
                // A new hour, output, refresh and throw away old bucket
                console.log(formatBucket(currentBucket));
                currentBucket = {
                    hour: hour,
                    count: 1,
                    sum: parseFloat(value)
                };
            } else {
                // still in bucket, sum
                currentBucket.count++;
                currentBucket.sum += parseFloat(value);
            }
        }
    }
    
    // Can also return dataList[dataList.length - 1] if assuming the data is always intact, 
    // i.e. only the last line can be incomplete. 
    // Here we discard all processed data points to "not store all data in memory", only the 
    // possible incomplete lines at the end of chunk are preserved
	return dataList
}

https.get(url, (resp) => {
    let leftover = '';
    
    resp.on('data', (chunk) => {
        leftover = handleDataChunk(leftover, chunk); 
    });

    resp.on('end', () => {
        // output the last bucket
        console.log(formatBucket(currentBucket));
    });

}).on("error", (err) => {
    console.log("Error: " + err.message);
});