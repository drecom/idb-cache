describe('Basic', function() {
  let idbc;
  function init() {
    idbc = new IDBCache('Basic', {});
  }
  before(init);
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
    it('empty string is ERROR.INVALID_ARGUMENT', function() {
      return idbc.set('empty', '').then(
        () => assert.fail(),
        (errorCode) => assert.deepEqual(IDBCache.ERROR.INVALID_ARGUMENT, errorCode)
      );
    });
    it('empty ArrayBuffer is ERROR.INVALID_ARGUMENT', function() {
      return idbc.set('empty', new ArrayBuffer()).then(
        () => assert.fail(),
        (errorCode) => assert.deepEqual(IDBCache.ERROR.INVALID_ARGUMENT, errorCode)
      );
    });
    it('empty Blob is ERROR.INVALID_ARGUMENT', function() {
      return idbc.set('empty', new Blob([new ArrayBuffer()])).then(
        () => assert.fail(),
        (errorCode) => assert.deepEqual(IDBCache.ERROR.INVALID_ARGUMENT, errorCode)
      );
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
    it('Can not find is ERROR.GET_EMPTY', function() {
      return idbc.get('empty').then(
        () => assert.fail(),
        (errorCode) => assert.deepEqual(IDBCache.ERROR.GET_EMPTY, errorCode)
      );
    });
  });
  describe('#delete', function() {
    it('string', function() {
      return idbc.delete('foo')
      .then(
        () => idbc.get('foo')
      ).then(
        () => assert.fail(),
        () => assert.ok(true)
      );
    });
    it('ArrayBuffer', function() {
      return idbc.delete('bar')
      .then(
        () => idbc.get('bar')
      ).then(
        () => assert.fail(),
        () => assert.ok(true)
      );
    });
    it('Blob', function() {
      return idbc.delete('baz')
      .then(
        () => idbc.get('baz')
      ).then(
        () => assert.fail(),
        () => assert.ok(true)
      );
    });
  });
  describe('#has', function() {
    it('exists', function() {
      return idbc.set('foo', 'string')
        .then(() => idbc.has('foo'))
        .then(assert.ok);
    });
    it('not exists', function() {
      return idbc.delete('foo')
        .then(() => idbc.has('foo'))
        .then(assert.isNotOk);
    });
    it('multiple sessions', function() {
      return idbc.set('foo', 'string')
        .then(() => {
          init();
          return idbc.has('foo');
        })
        .then(assert.ok);
    });
  });
});

describe('Limit Management', function() {
  let idbc;
  before(function() {
    idbc = new IDBCache('Limit', {size:128, count:2, defaultAge:2});
  });
  describe('#size', function() {
    it('Can save up to the limit', function() {
      return idbc.set('foo',  new ArrayBuffer(64))
      .then(
        () => idbc.set('bar', new ArrayBuffer(64))
      ).then(
        () => idbc.get('foo')
      ).then((data) => {
        assert.instanceOf(data, ArrayBuffer);
        assert.strictEqual(data.byteLength, 64);
        return idbc.get('bar');
      }).then((data) => {
        assert.instanceOf(data, ArrayBuffer);
        assert.strictEqual(data.byteLength, 64);
      });
    });
    it('Delete if exceeding the limit', function() {
      return idbc.set('foo',  new ArrayBuffer(64))
      .then(
        () => idbc.set('bar', new ArrayBuffer(65))
      ).then(
        () => idbc.get('foo')
      ).then(
        () => assert.fail(), // foo should have been deleted
        () => idbc.get('bar')
      ).then((data) => {
        assert.instanceOf(data, ArrayBuffer);
        assert.strictEqual(data.byteLength, 65);
      });
    });
  });
  describe('#count', function() {
    it('Can save up to the limit', function() {
      return idbc.set('foo', 'foo-value')
      .then(
        () => idbc.set('bar', 'bar-value')
      ).then(
        () => idbc.get('foo')
      ).then((data) => {
        assert.strictEqual(data, 'foo-value');
        return idbc.get('bar');
      }).then((data) => {
        assert.strictEqual(data, 'bar-value');
      });
    });
    it('Delete if exceeding the limit', function() {
      return idbc.set('foo', 'foo-value')
      .then(
        () => idbc.set('bar', 'bar-value')
      ).then(
        () => idbc.set('baz', 'baz-value')
      ).then(
        () => idbc.get('foo')
      ).then(
        () => assert.fail(), // foo should have been deleted
        () => idbc.get('bar')
      ).then((data) => {
        assert.strictEqual(data, 'bar-value');
        return idbc.get('baz');
      }).then((data) => {
        assert.strictEqual(data, 'baz-value');
      });
    });
  });
  describe('#age', function() {
    const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

    it('Can save up to the expire', function() {
      return idbc.set('foo', 'foo-value')
      .then(
        () => idbc.set('bar', 'bar-value')
      ).then(
        () => wait(1000)
      ).then(
        () => idbc.get('foo')
      ).then((data) => {
        assert.strictEqual(data, 'foo-value');
        return idbc.get('bar');
      }).then((data) => {
        assert.strictEqual(data, 'bar-value');
      });
    });

    it('Delete if exceeding the expire', function() {
      this.timeout(4000);

      return idbc.set('foo', 'foo-value')
      .then(
        () => idbc.set('bar', 'bar-value')
      ).then(
        () => wait(3000)
      ).then(
        () => idbc.get('foo')
      ).then(
        () => assert.fail(), // foo should have been deleted
        (errorCode) => {
          assert.deepEqual(IDBCache.ERROR.GET_EMPTY, errorCode)
          return idbc.get('bar');
        }
      ).then(
        () => assert.fail(), // bar should have been deleted
        (errorCode) => assert.deepEqual(IDBCache.ERROR.GET_EMPTY, errorCode)
      );
    });

    it('Delete in ascending order of expire', function() {
      this.timeout(4000);

      idbc.set('foo', 'foo-value', 2); // Save for 2 seconds
      idbc.set('bar', 'bar-value', 1); // Save for 1 seconds
      idbc.set('baz', 'baz-value', 2); // Save for 2 seconds

      return wait(3000)
      .then(
        () => idbc.get('foo')
      ).then(
        () => idbc.get('baz')
      ).then(
        () => idbc.get('bar')
      ).then(
        () => assert.fail(), // bar should have been deleted
        (errorCode) => assert.deepEqual(IDBCache.ERROR.GET_EMPTY, errorCode)
      );
    });
  });
});