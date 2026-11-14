import { test } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { createStadium } from "../src/stadium.ts";
import{stadiumSurface}from"../src/stadium-surface.ts";

test('中央凹碗有至少0.6高度差，細齒增加且保留出口空隙',()=>{
 const model=createStadium();model.updateMatrixWorld(true);const bowl=model.getObjectByName('bowl-surface')!;
 const height=(r:number)=>new THREE.Raycaster(new THREE.Vector3(r,2,0),new THREE.Vector3(0,-1,0)).intersectObject(bowl)[0].point.y;
 assert.ok(height(4.23)-height(.05)>.6,'中央與邊緣需明顯高低差');
 const teeth=model.getObjectByName('x-rail-teeth') as THREE.InstancedMesh;assert.ok(teeth.count>=280);
 const m=new THREE.Matrix4(),p=new THREE.Vector3();for(let i=0;i<teeth.count;i++){teeth.getMatrixAt(i,m);p.setFromMatrixPosition(m);const a=Math.atan2(p.z,p.x);assert.ok(Math.abs(a)>.23&&Math.abs(Math.PI-Math.abs(a))>.23&&Math.abs(a-Math.PI/2)>.28);}
 assert.ok(model.getObjectByName('center-recess-bevel'));assert.ok(model.getObjectByName('rail-carrier-fasteners'));
});

test("盤面曲率符合現有落點，三個出口保持可穿過的護牆開口", () => {
  const model = createStadium();
  model.updateMatrixWorld(true);
  const bowl = model.getObjectByName("bowl-surface")!;
  for (const r of [0.2, 1, 2, 3.8]) {
    const hit = new THREE.Raycaster(
      new THREE.Vector3(r, 2, 0),
      new THREE.Vector3(0, -1, 0),
    ).intersectObject(bowl)[0];
    assert.ok(hit);
    assert.ok(
      Math.abs(hit.point.y - stadiumSurface(r)) < 0.002,
      String(r),
    );
  }
  for (const direction of [
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(-1, 0, 0),
    new THREE.Vector3(0, 0, 1),
  ]) {
    const ray = new THREE.Raycaster(
      new THREE.Vector3(0, 0.75, 0),
      direction,
      4,
      5.3,
    );
    assert.equal(
      ray.intersectObject(model.getObjectByName("guard-panels")!).length,
      0,
    );
    assert.equal(
      ray.intersectObject(model.getObjectByName("guard-posts")!).length,
      0,
    );
  }
  for (const z of [-0.99, 0.99])
    for (const side of [-1, 1]) {
      const ray = new THREE.Raycaster(
        new THREE.Vector3(0, 0.75, z),
        new THREE.Vector3(side, 0, 0),
        4,
        5.3,
      );
      assert.equal(
        ray.intersectObject(model.getObjectByName("guard-panels")!).length,
        0,
        "側口需包含合法中心與半徑",
      );
    }
  for (const x of [-1.17, 1.17]) {
    const ray = new THREE.Raycaster(
      new THREE.Vector3(x, 0.75, 0),
      new THREE.Vector3(0, 0, 1),
      4,
      5.3,
    );
    assert.equal(
      ray.intersectObject(model.getObjectByName("guard-panels")!).length,
      0,
      "前口需包含合法中心與半徑",
    );
  }
  assert.equal(
    model.getObjectByName("exit-over-left")?.userData.finish,
    "over",
  );
  assert.equal(
    model.getObjectByName("exit-over-right")?.userData.finish,
    "over",
  );
  assert.equal(
    model.getObjectByName("exit-extreme")?.userData.finish,
    "extreme",
  );
});

test("整圈細齒含斜面倒角與齒根支撐，立體細節維持合批預算", () => {
  const model=createStadium();
  const teeth=model.getObjectByName("x-rail-teeth") as THREE.InstancedMesh;
  assert.ok(teeth.count>=220, `${teeth.count} teeth`);
  assert.ok(teeth.geometry.getAttribute("position").count>50, "齒形應有倒角與斜面");
  for(const name of ["rail-root-channel","rail-edge-beads","rim-support-webs"])
    assert.ok(model.getObjectByName(name),name);
  const positions=teeth.geometry.getAttribute("position");
  const xs=new Set(Array.from({length:positions.count},(_,i)=>positions.getX(i).toFixed(3)));
  assert.ok(xs.size>=4,"齒牙不是只有兩個平行面的方塊");
  let triangles=0;
  model.traverse(n=>{if(n instanceof THREE.Mesh)triangles+=(n.geometry.index?.count??n.geometry.getAttribute('position').count)/3*(n instanceof THREE.InstancedMesh?n.count:1);});
  assert.ok(triangles<=100000,`${triangles} triangles`);
  model.updateMatrixWorld(true);
  const rim=model.getObjectByName("molded-rim-deck")!;
  const radiusAt=(y:number)=>{
    const n=Math.SQRT1_2;
    const hit=new THREE.Raycaster(new THREE.Vector3(6*n,y,6*n),new THREE.Vector3(-n,0,-n),0,2).intersectObject(rim)[0];
    assert.ok(hit,"側面剖面可被光線命中");
    return Math.hypot(hit.point.x,hit.point.z);
  };
  assert.ok(radiusAt(.2)-radiusAt(.02)>.035,"側面凹槽為實際幾何深度");
  for(const [angle,side] of [[.24,-1],[Math.PI/2-.29,1],[Math.PI/2+.29,-1],[Math.PI-.24,1],[Math.PI+.24,-1],[Math.PI*2-.24,1]]) {
    const outward=new THREE.Vector3(-Math.sin(angle)*side,0,Math.cos(angle)*side);
    const origin=new THREE.Vector3(Math.cos(angle)*4.7,.2,Math.sin(angle)*4.7).addScaledVector(outward,.2);
    const hits=new THREE.Raycaster(origin,outward.negate(),0,.4).intersectObject(rim);
    assert.ok(hits.length>0,`出口端蓋從外側可見：${angle}`);
  }
});

test("細節盤體幾何有限、重複件實例化、透明護牆不使用折射且高度不遮視野", () => {
  const model = createStadium();
  let drawables = 0,
    instances = 0;
  model.traverse((node) => {
    if (node instanceof THREE.Mesh) {
      drawables++;
      for (const n of node.geometry.getAttribute("position").array)
        assert.ok(Number.isFinite(n));
      if (node instanceof THREE.InstancedMesh) {
        instances += node.count;
        for (const n of node.instanceMatrix.array)
          assert.ok(Number.isFinite(n));
      }
    }
  });
  assert.ok(drawables <= 45, `${drawables} drawables`);
  assert.ok(instances >= 150, `${instances} instances`);
  const bounds = new THREE.Box3().setFromObject(model);
  assert.ok(bounds.max.y <= 1.2);
  const guard = model.getObjectByName("guard-panels") as THREE.Mesh;
  assert.equal(
    (guard.material as THREE.MeshStandardMaterial).transparent,
    true,
  );
  assert.equal(
    (guard.material as THREE.MeshStandardMaterial).depthWrite,
    false,
  );
  assert.ok(!("transmission" in guard.material));
});
