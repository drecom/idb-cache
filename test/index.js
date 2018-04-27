/// <reference path="../dist/idb-cache.d.ts" />

describe('Basic', function() {
  let idbc;
  before(function() {
    idbc = new IDBCache('Basic', {});
  });
  describe('#set', function() {
    it('string', function() {
      return idbc.set('foo', 'string');
    });
    it('ArrayBuffer', function() {
      return idbc.set('bar', new ArrayBuffer(128));
    });
    it('Blob', function() {
      return idbc.set('baz', new Blob([new ArrayBuffer(128)]));
    });
  });
  describe('#update', function() {
    it('string', function() {
      return idbc.set('foo', 'string-update');
    });
    it('ArrayBuffer', function() {
      return idbc.set('bar', new ArrayBuffer(256));
    });
    it('Blob', function() {
      return idbc.set('baz', new Blob([new ArrayBuffer(256)]));
    });
  });
  describe('#get', function() {
    it('string', function() {
      return idbc.get('foo').then((data) => {
        assert.deepEqual(data, 'string-update');
      });
    });
    it('ArrayBuffer', function() {
      return idbc.get('bar').then((data) => {
        assert.instanceOf(data, ArrayBuffer);
        assert.strictEqual(data.byteLength, 256);
      });
    });
    it('Blob', function() {
      return idbc.get('baz').then((data) => {
        assert.instanceOf(data, Blob);
        assert.strictEqual(data.size, 256);
      });
    });
  });
  describe('#delete', function() {
    it('string', function() {
      return idbc.delete('foo').then(() => {
        return idbc.get('foo').then(() => {
          assert.fail();
        }).catch(() => {
          assert.ok(true);
        })
      });
    });
    it('ArrayBuffer', function() {
      return idbc.delete('bar').then(() => {
        return idbc.get('bar').then(() => {
          assert.fail();
        }).catch(() => {
          assert.ok(true);
        })
      });
    });
    it('Blob', function() {
      return idbc.delete('foo').then(() => {
        return idbc.get('bar').then(() => {
          assert.fail();
        }).catch(() => {
          assert.ok(true);
        })
      });
    });
  });
});

describe('Management', function() {
  let idbc;
  before(function() {
    idbc = new IDBCache('Management', {size:128, count:2, defaultAge:1});
  });
  describe('#size', function() {
    it('Can save up to the limit', function() {
      idbc.set('foo',  new ArrayBuffer(64));
      idbc.set('bar', new ArrayBuffer(64));
      return idbc.get('foo').then((data) => {
        assert.instanceOf(data, ArrayBuffer);
        assert.strictEqual(data.byteLength, 64);
        return idbc.get('bar').then((data) => {
          assert.instanceOf(data, ArrayBuffer);
          assert.strictEqual(data.byteLength, 64);
        });
      });
    });
    it('Delete if exceeding the limit', function() {
      idbc.set('foo',  new ArrayBuffer(64));
      idbc.set('bar', new ArrayBuffer(65));
      return idbc.get('foo').then((data) => {
        assert.fail();
      }).catch(() => {
        return idbc.get('bar').then((data) => {
          assert.instanceOf(data, ArrayBuffer);
          assert.strictEqual(data.byteLength, 65);
        });
      });
    });
  });
  describe('#count', function() {
    it('Can save up to the limit', function() {
      idbc.set('foo', 'foo-value');
      idbc.set('bar', 'bar-value');
      return idbc.get('foo').then((data) => {
        assert.strictEqual(data, 'foo-value');
        return idbc.get('bar').then((data) => {
          assert.strictEqual(data, 'bar-value');
        });
      });
    });
    it('Delete if exceeding the limit', function() {
      idbc.set('foo', 'foo-value');
      idbc.set('bar', 'bar-value');
      idbc.set('baz', 'baz-value');
      return idbc.get('foo').then((data) => {
        assert.fail();
      }).catch(() => {
        return idbc.get('bar').then((data) => {
          assert.strictEqual(data, 'bar-value');
          return idbc.get('baz').then((data) => {
            assert.strictEqual(data, 'baz-value');
          });
        });
      });
    });
  });
});