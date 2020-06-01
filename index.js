const fs = require('fs');
const path = require('path');
const URL = require('url');
const cheerio = require('cheerio');

const vendorLibVesrions = {
  'es6-promise': require('es6-promise/package.json').version,
  unfetch: require('unfetch/package.json').version
};

const goodieBagFileName = 'goodie-bag.min.js';
const goodieBagHeaderComment = `/**
* parcel-plugin-goodie-bag
* 
* Provides a high-level polyfill to both the Promise and fetch APIs, to keep parcel working on IE(11).
* This works around: https://github.com/parcel-bundler/parcel/issues/2364
* 
* Built with es6-promise@${vendorLibVesrions["es6-promise"]} and unfetch@${vendorLibVesrions.unfetch}.
*  
* src: https://github.com/edm00se/parcel-plugin-goodie-bag
*/`;

module.exports = function(bundler) {
  bundler.on('bundled', bund => {
    if (bund.type === 'html') {
      injectGoodies(bund)
    }

    if (bund.childBundles && bund.childBundles.size) {
      for (const childBund of bund.childBundles) {
        if (childBund.type === 'html') {
          injectGoodies(childBund)
        }
      }
    }
  });
};

function injectGoodies(bund) {
  const filePath = bund.name;
  const bundlePublicUrl = bund.entryAsset.options.publicURL;
  const bundleRootUrl = bund.entryAsset.options.env.ROOT_PUBLIC_URL;
  const finalResolvedGoodieBagDestination = resolveGoodieBagPath(
    bundlePublicUrl, bundleRootUrl
  );
  console.log(finalResolvedGoodieBagDestination)
  const bundleDir = path.dirname(bund.name);
  const content = fs.readFileSync(filePath, 'utf8');
  const $ = cheerio.load(content);

  if(!$(`script[src="${finalResolvedGoodieBagDestination}"]`).length > 0){
    $('head').prepend(
      `<script src="${finalResolvedGoodieBagDestination}"></script>`
    );
    fs.writeFileSync(filePath, $.html());
  
    copyGoodiesToDist(bundleDir);
  }
}

function copyGoodiesToDist(outDir) {
  const polyPromisePath = require.resolve(
    'es6-promise/dist/es6-promise.auto.min.js'
  );
  const polyPromiseContent = fs.readFileSync(polyPromisePath, 'utf8');
  const polyFetchPath = require.resolve('unfetch/polyfill/index.js');
  const polyFetchContent = fs.readFileSync(polyFetchPath, 'utf8');

  const polyFileContent = [
    goodieBagHeaderComment,
    polyPromiseContent,
    polyFetchContent
  ].join('\n');

  fs.writeFileSync(path.join(outDir, goodieBagFileName), polyFileContent);
}

function resolveGoodieBagPath(bundlePublicUrl, bundleRootUrl) {
  const url = URL.parse(bundlePublicUrl, false, true);
  const assetUrl = URL.parse(goodieBagFileName);
  url.pathname = path.posix.join(url.pathname, assetUrl.pathname);
  return bundleRootUrl ? bundleRootUrl + URL.format(url) : URL.format(url);
}
