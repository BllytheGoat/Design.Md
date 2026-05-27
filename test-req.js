import http from "http";

const req = http.request(
  {
    hostname: "localhost",
    port: 3000,
    path: "/api/generate-design-md",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  },
  (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
    res.setEncoding("utf8");
    let data = "";
    res.on("data", (chunk) => {
      data += chunk;
    });
    res.on("end", () => {
      console.log(`BODY: ${data}`);
    });
  }
);

req.on("error", (e) => {
  console.error(`problem with request: ${e.message}`);
});

// Write data to request body
req.write(JSON.stringify({ url: "example.com" }));
req.end();
