Package.describe({
    name: "jandres:snapjs",
    summary: "A Library for creating beautiful mobile shelfs in Javascript (Facebook and Path style side menus)",
    version: "2.0.9",
    git: "https://github.com/JoeyAndres/Snap.js.git"
});

Package.onUse(function(api) {
    api.versionsFrom("1.2.1");

    api.addFiles([
        "dist/snap.js",
        "dist/snap.css"
    ], 'client');
});