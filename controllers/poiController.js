const db = require('../db');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

// Helper: build full URL
const buildImageUrl = (filename) =>
    `${process.env.BASE_URL}/uploads/poi/${filename}`;

// GET all POIs
exports.getAllPOIs = async (req, res) => {
    try {
        const [rows] = await db.query(`
      SELECT p.*, c.name AS category_name
      FROM places_of_interest p
      JOIN categories c ON p.category_id = c.id
    `);

        const pois = rows.map(poi => ({
            ...poi,
            images: JSON.parse(poi.images || '[]').map(img => buildImageUrl(img)),
            location: JSON.parse(poi.location),
        }));

        res.json(pois);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// POST new POI
exports.createPOI = async (req, res) => {
    try {
        const { name, description, category_id, location } = req.body;
        const id = uuidv4();

        // Validate image uploads
        const files = req.files || [];
        const imageFilenames = files.slice(0, 2).map(file => file.filename);
        const imagesJson = JSON.stringify(imageFilenames);

        const [result] = await db.query(
            'INSERT INTO places_of_interest (id, name, description, category_id, location, images) VALUES (?, ?, ?, ?, ?, ?)',
            [id, name, description, category_id, location, imagesJson]
        );

        res.status(201).json({ id, name, imagePaths: imageFilenames });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// UPDATE a POI
exports.updatePOI = async (req, res) => {
    const { id } = req.params;
    const { name, description, category_id, location } = req.body;

    try {
        // Optional: handle new images if any
        const files = req.files || [];
        const newImageFilenames = files.slice(0, 2).map(f => f.filename);
        const newImagesJson = newImageFilenames.length > 0 ? JSON.stringify(newImageFilenames) : null;

        const updateFields = [];
        const values = [];

        if (name) { updateFields.push("name = ?"); values.push(name); }
        if (description) { updateFields.push("description = ?"); values.push(description); }
        if (category_id) { updateFields.push("category_id = ?"); values.push(category_id); }
        if (location) { updateFields.push("location = ?"); values.push(location); }
        if (newImagesJson) { updateFields.push("images = ?"); values.push(newImagesJson); }

        if (updateFields.length === 0) {
            return res.status(400).json({ error: "No valid fields provided to update." });
        }

        values.push(id);

        const sql = `UPDATE places_of_interest SET ${updateFields.join(', ')} WHERE id = ?`;
        await db.query(sql, values);

        res.json({ message: 'POI updated successfully.' });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// DELETE a POI
exports.deletePOI = async (req, res) => {
    const { id } = req.params;

    try {
        // Get current image paths
        const [rows] = await db.query('SELECT images FROM places_of_interest WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ error: 'POI not found' });

        const images = JSON.parse(rows[0].images || '[]');

        // Delete from DB
        await db.query('DELETE FROM places_of_interest WHERE id = ?', [id]);

        // Delete images from disk
        images.forEach(filename => {
            const filePath = path.join(__dirname, '..', 'uploads', 'poi', filename);
            fs.unlink(filePath, err => {
                if (err) console.error(`Failed to delete ${filePath}:`, err.message);
            });
        });

        res.json({ message: 'POI and images deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};