#easy-fetcher
##项目介绍
基于promise和fetch封装的网络请求库
##使用范例
```javascript
        async request() {
               const fetcher = new Fetcher("http://www.***.com", {"Content-Type": "application/json"}, DataType.JSON, 10000);
               try {
                   // fetcher.delete|post|get|patch...
                   const result = await fetcher.post({
                       path: "/ass/ddd",
                       pathId: 123,
                       query: {limit: [1, 20]},
                       body: {name: "abc", age: 12},
                       headers: {"token": "abcd", "Content-Type": "application/***"}
                   });
                   console.log(result);
               } catch (e) {
                   console.log(e);
               }
           }

```

