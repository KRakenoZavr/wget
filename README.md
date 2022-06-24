# wget

## install

```bash
npm i
```

## usage

```bash
node index.js http://example.com
```

### flags

Flags list:

| Definition     | Symbol       | Usage                      |
| -------------- | ------------ | -------------------------- |
| Background     | -B           | -B                         |
| Limit speed    | --rate-limit | --rate-limit=500 (k, M, G) |
| File name      | -O           | -O=file.jpg                |
| Path name      | -P           | -P=~Downloads              |
| Load from file | -i           | -i=download.txt            |
| Mirror         | --mirror     | --mirror                   |
| Reject         | -R           | -R=js,css                  |
| Exclude        | -X           | -X=/assets,/js             |
