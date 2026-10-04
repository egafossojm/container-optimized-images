# frozen_string_literal: true

require "rack"

app = lambda do |_env|
  body = "ok\n"
  [
    200,
    {
      "content-type" => "text/plain; charset=utf-8",
      "content-length" => body.bytesize.to_s,
      "x-content-type-options" => "nosniff",
    },
    [body],
  ]
end

run app
