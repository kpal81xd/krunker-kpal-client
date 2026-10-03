import { join } from 'path';

import { rcedit } from 'rcedit';

/**
 * electron-builder's own resource editor cannot parse electron 7's exe,
 * so rcedit sets the windows icon and version info instead.
 * @param {import('electron-builder').AfterPackContext} context
 */
export default async ({ appOutDir, electronPlatformName, packager }) => {
    if (electronPlatformName !== 'win32') {
        return;
    }
    const { productFilename, productName, version, copyright } = packager.appInfo;
    await rcedit(join(appOutDir, `${productFilename}.exe`), {
        icon: join(packager.buildResourcesDir, 'icon.ico'),
        'file-version': version,
        'product-version': version,
        'version-string': {
            ProductName: productName,
            FileDescription: productName,
            OriginalFilename: `${productFilename}.exe`,
            LegalCopyright: copyright,
        },
    });
};
