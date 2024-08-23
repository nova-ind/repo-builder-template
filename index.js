const { resolve } = require("node:path")
const path = require("node:path")
var beginTime = new Date().getTime()
function logTime(label) {
    console.log(`"${label}" took ${new Date().getTime() - beginTime}ms`)
}
function fixHTML(html) {
    html = html.replaceAll(/<script>.*<\/script>/gi, '');
    html = html.replaceAll(/(\s+on\w+="[^"]*")/gi, '');
    html = html.replaceAll(/href="javascript:.*"/gi, '');
    return html.replaceAll(/<a\s(?![^>]*\btarget\b)([^>]*)>/gi, '<a target="_blank" $1>');
}
var stats = {
    unprocessed: [],
    processed: [],
    totalTime: 0
}
const fs = require("node:fs")
function writef(p, c) {
    return fs.writeFile(resolve(p), Buffer.from(c), 'utf8', new Function)
}
function readf(p) {
    // var fc = "";
    // fs.readFile(resolve(p), 'utf8', (err, data) => {
    //     if (err) {
    //         console.error(err);
    //         return;
    //     }
    //     fc = data;
    //     console.log("A", typeof data)
    // });

    return fs.readFileSync(p, "utf8").toString();
}
function mkdir(d) {
    fs.mkdir(resolve(d), { recursive: true }, new Function)
}
function imageToBase64Url(imagePath) {
    // Read the image file
    const image = fs.readFileSync(resolve(imagePath));
  
    // Get the file extension
    const extname = path.extname(resolve(imagePath)).slice(1);
  
    // Convert the image data to Base64
    const base64Image = image.toString('base64');
  
    // Construct the Data URL
    const dataUrl = `data:image/${extname};base64,${base64Image}`;
  
    return dataUrl;
  }
console.log(readf("./meta.json"))
var meta = JSON.parse(readf("./meta.json"))
fs.rm(resolve("./_out/"), { recursive: true }, function () {
    mkdir("./_out/")
    if (!meta.isTestBuild) { meta.version = +(Number(meta.version) + 0.1).toFixed(1) }
    console.log(String(meta.version).includes("."))
    writef("./meta.json", JSON.stringify(meta, null, 2))
    console.log("Beginning build process...")
    fs.readdir(resolve("./applications"), (err, cont) => {
        cont.forEach(file => {
            console.info(`Processing app: ${file}`)
            if (fs.lstatSync(resolve(`./applications/${file}`)).isDirectory()) {
                logTime(`Start: ${file}`)
                mkdir(`./_out/${file}`)
                var appmeta = JSON.parse(readf(`./applications/${file}/meta.json`))
                appmeta.scripts = []
                if(appmeta.hasOwnProperty("icon")) {
                    appmeta.icon = imageToBase64Url(`./applications/${file}/${appmeta.icon}`)
                }
                else{
                    appmeta.icon = imageToBase64Url(`./icon.svg`)
                }
                if(appmeta.hasOwnProperty("banner")) {
                    appmeta.icon = imageToBase64Url(`./applications/${file}/${appmeta.banner}`)
                }
                else{
                    appmeta.icon = imageToBase64Url(`./banner.svg`)
                }
                writef(`./_out/${file}/desc.html`, fixHTML(readf(`./applications/${file}/desc.html`)))
                mkdir(`./_out/${file}/scripts`)
                fs.readdir(resolve(`./applications/${file}/scripts`), (err, cont) => {
                    cont.forEach(script => {
                        if (script.endsWith(".js") || script.endsWith(".ts")) {
                            writef(`./_out/${file}/scripts/${script}`, readf(`./applications/${file}/scripts/${script}`))
                            appmeta.scripts.push(script)
                        }
                    });
                    writef(`./_out/${file}/meta.json`, JSON.stringify(appmeta))
                    var fc = JSON.parse(readf(`./applications/${file}/meta.json`))
                    meta.categories.push(fc.category)
                    console.log(meta)
                    logTime(`${file}`)
                    stats.processed.push(file)
                });
            } else {
                stats.unprocessed.push(file)
                console.warn(`Application: ${file}
            This application is formatted incorrectly, and will not be outputted. Please ensure that all applications are in the following structure
            FOLDER: ${file}
                \ FILE:   meta.json (this contains the application metadata)
                \ FOLDER: scripts (this contains all scripts for the app, the usual 'main.js' etc)`)
            }
        });
        writef("./_out/meta.json", JSON.stringify(meta))
        writef("./_out/index.html", `
    <center>
    <h1>${meta.name}</h1>
    <h2>You may add this repo by: Opening app store > This Device > Sources > Add and put the URL below.</h2>
    <code> ${meta.url} </code>
    </center>
    `)
        stats.totalTime = new Date().getTime() - beginTime
        fs.writeFile(resolve(`./_out/stats.json`), Buffer.from(JSON.stringify(stats)), 'utf8', err => {
            if (err) {
                console.error(err);
            } else {
                // file written successfully
            }
        });
        stats.totalTime = `${stats.totalTime}ms`
        console.log(`Stats: ${JSON.stringify(stats, null, 2).replaceAll('"', '')}`)
    });
});