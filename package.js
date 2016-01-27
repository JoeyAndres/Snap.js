Package.describe({
    name: "jandres:snapjs",
    summary: "A Library for creating beautiful mobile shelfs in Javascript (Facebook and Path style side menus)",
    version: "1.9.4",
    git: "https://github.com/JoeyAndres/Snap.js.git"
});

Package.onUse(function(api) {
    api.versionsFrom("1.2.1");
    api.use([
        "ecmascript"
    ], 'client');

    api.addFiles([
        "snap.js",
        "snap.css"
    ]);

    api.export('Snap');
});