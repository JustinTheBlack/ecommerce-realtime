'use strict'

/** @typedef {import('@adonisjs/framework/src/Request')} Request */
/** @typedef {import('@adonisjs/framework/src/Response')} Response */
/** @typedef {import('@adonisjs/framework/src/View')} View */
const Image = use('App/Models/Image')
const { manage_single_upload, manage_multiple_uploads } = use('App/Helpers')
const fs = use('fs')
const Transformer = use('App/Transformers/Admin/ImageTransformer')

/**
 * Resourceful controller for interacting with images
 */
class ImageController {
  /**
   * Show a list of all images.
   * GET images
   *
   * @param {object} ctx
   * @param {TransformWith} ctx.transform
   * @param {Response} ctx.response
   * @param {Object} ctx.pagination
   */
  async index ({ response, pagination, transform }) {
    var images = await Image.query().orderBy('id','DESC').paginate(pagination.page, pagination.limit)
    images = await transform.paginate(images, Transformer)
    return response.send(images)
  }

  /**
   * Create/save a new image.
   * POST images
   *
   * @param {object} ctx
   * @param {TransformWith} ctx.transform
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   */
  async store ({ request, response, transform }) {
    try {
      // Captura uma image ou mais do request
      const fileJar = request.file('images', {
        types: ['image'],
        size: '2mb'
      })

      // retorno pro usuario
      let images = []
      // caso seja um unico arquivo - manage_single_upload
      if ( !fileJar.files ) {
        const file = await manage_single_upload(fileJar)
        if ( file.moved() ) {
          const image = await Image.create({
            path: file.fileName,
            size: file.size,
            original_name: file.clientName,
            extension: file.subtype
          })
          const transformedImage = await transform.item(image, Transformer)
          images.push(transformedImage)
          return response.status(201).send({ sucesses: images, errors: {} })
        }

        return response.status(400).send({
          message: 'Não foi possível processar esta imagem no momento!'
        })
      }
      // caso sejam vários arquivos - manage_multiple_uploads
      let files = await manage_multiple_uploads(fileJar)
      await Promise.all(
        file.sucesses.map(async file => {
          const image = await Image.create({
            path: file.fileName,
            size: file.size,
            original_name: file.clientName,
            extension: file.subtype
          })
          const transformedImage = await transform.item(image, Transformer)
          images.push(transformedImage)
        })
      )
      return response.status(201).send({ sucesses: images, errors: files.errors })
    } catch (error) {
      return response.status(401).send({ message: 'Não foi possível processar a sua solicitação!' })
    }
  }

  /**
   * Display a single image.
   * GET images/:id
   *
   * @param {object} ctx
   * @param {Response} ctx.response
   * @param {TransformWith} ctx.transform
   */
  async show ({ params: { id }, response, transform }) {
    var image = await Image.findOrFail(id)
    image = await transform.item(image, Transformer)
    return response.send(image)
  }

  /**
   * Update image details.
   * PUT or PATCH images/:id
   *
   * @param {object} ctx
   * @param {Request} ctx.request
   * @param {Response} ctx.response
   * @param {TransformWith} ctx.transform
   */
  async update ({ params: { id }, request, response, transform }) {
    var image = await Image.findOrFail(id)
    try {
      image.merge(request.only( [ 'original_name' ] ))
      await image.save()
      image = await transform.item(image, Transformer)
      return response.status(200).send(image)
    } catch (error) {
      return response.status(400).send({
        message: 'Não foi possível atualizar esta imagem!'
      })
    }
  }

  /**
   * Delete a image with id.
   * DELETE images/:id
   *
   * @param {object} ctx
   * @param {Response} ctx.response
   */
  async destroy ({ params: { id }, response }) {
    const image = await Image.findOrFail(id)
    try {
      let filepath = Helpers.publicPath( `uploads/${image.path}` )
      fs.unlink(filepath)
      await image.delete()
      return response.status(204).send()
    } catch (error) {
      return response.status(400).send({ message: 'Não foi possível deletar a image no momento!' })
    }

  }
}

module.exports = ImageController
