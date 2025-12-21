import bpy
import sys

argv = sys.argv
argv = argv[argv.index("--") + 1:]

input_file = argv[0]
output_file = argv[1]
body_ratio = float(argv[2]) if len(argv) > 2 else 0.02  # Very aggressive for body
face_ratio = float(argv[3]) if len(argv) > 3 else 0.15  # Keep more detail for face
face_cutoff_y = float(argv[4]) if len(argv) > 4 else 0.5  # Y threshold for "face" area

print(f"Input: {input_file}")
print(f"Output: {output_file}")
print(f"Body ratio: {body_ratio}, Face ratio: {face_ratio}, Face cutoff Y: {face_cutoff_y}")

# Clear scene
bpy.ops.wm.read_factory_settings(use_empty=True)

# Import GLB
bpy.ops.import_scene.gltf(filepath=input_file)

mesh_objects = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']
print(f"Found {len(mesh_objects)} mesh objects")

for obj in mesh_objects:
    print(f"Processing: {obj.name}")
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    
    # Get mesh data
    mesh = obj.data
    original_faces = len(mesh.polygons)
    print(f"  Original faces: {original_faces}")
    
    # Find Y bounds to determine face region
    verts = mesh.vertices
    min_y = min(v.co.y for v in verts)
    max_y = max(v.co.y for v in verts)
    y_range = max_y - min_y
    face_threshold = max_y - (y_range * (1 - face_cutoff_y))  # Top portion is "face"
    
    print(f"  Y range: {min_y:.2f} to {max_y:.2f}, face threshold: {face_threshold:.2f}")
    
    # Create vertex groups for face and body
    face_group = obj.vertex_groups.new(name="Face")
    body_group = obj.vertex_groups.new(name="Body")
    
    face_verts = []
    body_verts = []
    
    for v in verts:
        if v.co.y >= face_threshold:
            face_verts.append(v.index)
        else:
            body_verts.append(v.index)
    
    face_group.add(face_verts, 1.0, 'REPLACE')
    body_group.add(body_verts, 1.0, 'REPLACE')
    
    print(f"  Face vertices: {len(face_verts)}, Body vertices: {len(body_verts)}")
    
    # First pass: Decimate body aggressively
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='DESELECT')
    bpy.ops.object.mode_set(mode='OBJECT')
    
    # Apply decimate with vertex group for body
    mod_body = obj.modifiers.new(name="DecimateBody", type='DECIMATE')
    mod_body.decimate_type = 'COLLAPSE'
    mod_body.ratio = body_ratio
    mod_body.vertex_group = "Body"
    bpy.ops.object.modifier_apply(modifier="DecimateBody")
    
    # Second pass: Decimate face less aggressively  
    mod_face = obj.modifiers.new(name="DecimateFace", type='DECIMATE')
    mod_face.decimate_type = 'COLLAPSE'
    mod_face.ratio = face_ratio
    mod_face.vertex_group = "Face"
    bpy.ops.object.modifier_apply(modifier="DecimateFace")
    
    new_faces = len(obj.data.polygons)
    print(f"  New faces: {new_faces} ({100*new_faces/original_faces:.1f}%)")
    
    obj.select_set(False)

# Export
bpy.ops.export_scene.gltf(filepath=output_file, export_format='GLB', use_selection=False)
print(f"Exported to: {output_file}")
