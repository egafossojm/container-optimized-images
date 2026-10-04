<?php

declare(strict_types=1);

require __DIR__ . '/../vendor/autoload.php';

use Monolog\Handler\StreamHandler;
use Monolog\Level;
use Monolog\Logger;

$log = new Logger('app');
$log->pushHandler(new StreamHandler('php://stdout', Level::Info));
$log->info('request');

header('Content-Type: text/plain; charset=utf-8');
header('X-Content-Type-Options: nosniff');
echo "ok\n";
