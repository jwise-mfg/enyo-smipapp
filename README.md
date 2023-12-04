# Enyo SMIP App

A simple web application for the SMIP using only Javascript XHR and the Enyo framework.

This example is intended to work on the widest possible range of web-enabled devices, and as such makes use of some older, more compatible technologies. For examples of SMIP API access using the latest technologies, please see the [CESMII API GitHub Repo](https://github.com/cesmii/API).

Requires [Enyo 1.0](https://github.com/enyojs/enyo-1.0) on the host.

Install in a subfolder called `.enyo`.

# Config

The `smip` section in `appinfo.json` can be used to configure defaults. Be aware that it will be visible to any visitor, don't save secrets you don't want the world to find.

Specifying the `parentId` will filter results to equipment below that id.

The user can over-ride the above settings, by saving their own settings in a cookie. Clearing the cookies has the effect of returning to the default specified in the config.

Specifying the `machineType` will filter results to equipment of only that type.

Changing the `sampleWindow*` settings will effect the charts (and performance).

The user cannot over-ride the `machineType` or `sampleWindow*` config.

# Customization

Modify the `icon*.png`, the contents of `icons` subfolder, `manifest.json` and `appinfo.json` to brand or customize the app.