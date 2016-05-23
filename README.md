# jquery-idleTimeout-plus

User idle detector with session keep-alive, warning dialogs, lock screen and redirection with support for multiple windows and tabs.

* Highly configurable
* Multiple window/tab support
* Callback support for all events (idle,warning,lock screen, logout and redirect)
* Callback support for dialog/screen creation
* Support for both jQueryUI and Bootstrap GUI frameworks
* Modular code supports AMD/CommonJS

Inspired by [Jill Elaine's jquery-idleTimeout](https://github.com/josebalius/jquery-idleTimeout) and [Orangehill's bootstrap-session-timeout](https://github.com/orangehill/bootstrap-session-timeout)

## Getting Started
### Installation
**NPM**

`npm install jquery-idleTimeout-plus -S`

**Bower**

`bower install jquery-idleTimeout-plus`

Adding to your website
```
<head>
    <!-- include jQuery & other necessary dependencies -->
    ...
    <link href="/css/jquery-idleTimeout-plus.css" rel="stylesheet" type="text/css" />
    <script src="/scripts/jquery-idleTimeout-plus.js" type="text/javascript"></script>
    ...
    
</head>
```

### Dependencies

* jQuery +1.7
* jQuery UI +1.9 or Bootstrap 3
* [jQuery Storage API](https://github.com/julien-maurel/jQuery-Storage-API) (for iFrame or Multi-tab support)
* [jQuery BlockUI](http://jquery.malsup.com/block/) (for lock screen support)

### Basic Usage
```
jQuery(document).ready(function() {
    IdleTimeoutPlus.start();
});
```

## Options

#### Basic Settings

| Settings      | Type   | Default                            | Descritption               |
|:--------------|:------:|:-----------------------------------|:---------------------------|
| idleTimeLimit | int    | 1200 (20min)                       | idle timeout in seconds    |
| bootstrap     | bool   | false                              | enable bootstrap           |
| warnTimeLimit | int    | 180 (3min)                         | warning timeout in seconds |
| warnMessage   | string | Your session is about to expire! | warning dialog message     |
| redirectUrl              | string       |/timed-out                                    | Redirect URL for user timeout                            |

#### Detailed Settings
| Setting Name  ||
|:----:|:-------:|
| Type | Default |
|  Description  ||


|idleTimeLimit||
 ------------ | -----------: |
|int|1200 (20 min) |
The time limit in seconds 
