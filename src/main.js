import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js'

/* ---------------- SCENE ---------------- */
const scene = new THREE.Scene()
scene.background = new THREE.Color(0xd1d7d7)

/* ---------------- CAMERA ---------------- */
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
)
camera.position.z = 5

/* ---------------- RENDERER ---------------- */
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

/* ---------------- POST PROCESSING ---------------- */
const composer = new EffectComposer(renderer)

const renderPass = new RenderPass(scene, camera)
composer.addPass(renderPass)

const outlinePass = new OutlinePass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  scene,
  camera
)

outlinePass.edgeStrength = 3
outlinePass.edgeThickness = 1
outlinePass.visibleEdgeColor.set(0x00ffff)
outlinePass.hiddenEdgeColor.set(0x000000)

composer.addPass(outlinePass)

/* ---------------- CONTROLS ---------------- */
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

/* ---------------- LIGHTING ---------------- */
const light = new THREE.DirectionalLight(0xffffff, 1)
light.position.set(5, 5, 5)
scene.add(light)

const ambient = new THREE.AmbientLight(0x404040)
scene.add(ambient)

/* ---------------- RAYCASTING ---------------- */
const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()

/* ---------------- MULTI-PART OBJECT ---------------- */
const objectGroup = new THREE.Group()

const part1 = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 0.3),
  new THREE.MeshStandardMaterial({ color: 0x00aaff })
)

const part2 = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 0.3),
  new THREE.MeshStandardMaterial({ color: 0x00ffaa })
)

const part3 = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 0.3),
  new THREE.MeshStandardMaterial({ color: 0xffaa00 })
)

part1.position.z = -0.35
part3.position.z = 0.35

objectGroup.add(part1)
objectGroup.add(part2)
objectGroup.add(part3)

scene.add(objectGroup)

/* ---------------- SELECTION ---------------- */
let currentlySelected = null

window.addEventListener('click', (event) => {

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1

  raycaster.setFromCamera(mouse, camera)

  const intersects = raycaster.intersectObjects(objectGroup.children, true)

  if (intersects.length > 0) {
    currentlySelected = intersects[0].object
    outlinePass.selectedObjects = [currentlySelected]
  } else {
    currentlySelected = null
    outlinePass.selectedObjects = []
  }
})

/* ---------------- EXPLOSION LOGIC ---------------- */
let exploded = false

window.addEventListener('keydown', (event) => {
  if (event.key === 'e') {
    exploded = !exploded
  }
})

/* ---------------- ANIMATION LOOP ---------------- */
function animate() {
  requestAnimationFrame(animate)

  const distance = exploded ? 1 : 0

  part1.position.z += ((-0.35 - distance) - part1.position.z) * 0.1
  part2.position.z += (0 - part2.position.z) * 0.1
  part3.position.z += ((0.35 + distance) - part3.position.z) * 0.1

  controls.update()
  composer.render()
}

animate()

/* ---------------- RESIZE HANDLING ---------------- */
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
  composer.setSize(window.innerWidth, window.innerHeight)
})